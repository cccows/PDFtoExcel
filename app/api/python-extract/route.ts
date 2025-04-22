import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import os from "os";

const execPromise = promisify(exec);
const writeFilePromise = promisify(fs.writeFile);

export async function POST(request: NextRequest) {
  // Create a unique temp directory for this request
  const tempDir = path.join(os.tmpdir(), "textoexcel_" + Date.now());
  
  try {
    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });
    console.log("Created temp directory:", tempDir);
    
    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log("Processing file:", file.name);
    
    // Create paths for temporary files
    const tempInputPath = path.join(tempDir, file.name);
    const tempOutputPath = path.join(tempDir, "output.md");
    const excelOutputPath = path.join(tempDir, "output.xlsx");

    // Write the uploaded file to the temp directory
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFilePromise(tempInputPath, buffer);
    console.log("File saved to:", tempInputPath);
    
    // Get absolute path to the Python script
    const scriptPath = path.join(process.cwd(), "extract.py");
    console.log("Script path:", scriptPath);
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Python script not found at: ${scriptPath}`);
    }

    // Execute the Python script
    console.log(`Executing Python script with: ${tempInputPath} ${tempOutputPath} ${excelOutputPath}`);
    const { stdout, stderr } = await execPromise(
      `python "${scriptPath}" "${tempInputPath}" "${tempOutputPath}" "${excelOutputPath}"`
    );
    
    console.log("Python stdout:", stdout);
    
    if (stderr) {
      console.error("Python stderr:", stderr);
    }

    // Check if Excel file was created
    if (!fs.existsSync(excelOutputPath)) {
      throw new Error(`Excel file not created. Python output: ${stdout}`);
    }

    // Read the Excel file
    const excelBuffer = fs.readFileSync(excelOutputPath);
    console.log(`Excel file created (${excelBuffer.length} bytes)`);

    // Return the Excel file as a download
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${path.parse(file.name).name}_extracted.xlsx"`,
      },
    });
    
  } catch (error) {
    console.error("Python extraction error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to process file with Python",
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log("Cleaned up temp directory:", tempDir);
      }
    } catch (cleanupError) {
      console.error("Error cleaning up temporary files:", cleanupError);
    }
  }
}