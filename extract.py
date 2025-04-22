import pandas as pd
import re
import sys
import os
import traceback

# Try to import docling, but provide helpful error if not available
try:
    from docling.document_converter import DocumentConverter
except ImportError:
    print("ERROR: docling package not installed. Please install it with: pip install docling")
    sys.exit(1)

def extract_text_from_file(file_path):
    """
    Extract text from a file using appropriate method based on file extension
    """
    print(f"Extracting text from: {file_path}")
    
    # Get file extension
    _, ext = os.path.splitext(file_path.lower())
    
    try:
        # Use DocumentConverter for all supported file types
        converter = DocumentConverter()
        result = converter.convert(file_path)
        
        # Extract text and convert to Markdown
        markdown_content = result.document.export_to_markdown()
        
        print(f"Successfully extracted {len(markdown_content)} chars of text")
        return markdown_content
    except Exception as e:
        print(f"Error extracting text: {str(e)}")
        print(traceback.format_exc())
        # Create a simple markdown file with the error
        return f"# Error extracting text\n\nFailed to extract text from {os.path.basename(file_path)}\n\nError: {str(e)}"


def markdown_to_excel(markdown_file, excel_file=None):
    """
    Convert markdown tables to Excel spreadsheet
    
    Args:
        markdown_file (str): Path to markdown file
        excel_file (str, optional): Path to output Excel file. If None, uses the same name as markdown file with .xlsx extension
    
    Returns:
        str: Path to the created Excel file
    """
    print(f"Converting markdown to Excel: {markdown_file} -> {excel_file}")
    
    # If excel_file not provided, use markdown filename with xlsx extension
    if excel_file is None:
        excel_file = os.path.splitext(markdown_file)[0] + '.xlsx'
    
    # Ensure the file has the correct extension
    if not excel_file.lower().endswith('.xlsx'):
        excel_file = os.path.splitext(excel_file)[0] + '.xlsx'
        print(f"Changed output extension to .xlsx: {excel_file}")
    
    # Read markdown content
    try:
        with open(markdown_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: Markdown file not found: {markdown_file}")
        return None
    except Exception as e:
        print(f"Error reading markdown file: {e}")
        return None
    
    # Find all markdown tables
    table_pattern = r'(?:\|[^\n]+\|\n\|[-:| ]+\|\n)(?:\|[^\n]+\|\n)+'
    tables = re.findall(table_pattern, content)
    
    print(f"Found {len(tables)} tables in markdown file")
    
    # Always create Excel file, with or without tables
    try:
        with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
            if not tables:
                print("No markdown tables found - creating info sheet")
                # Create a sheet with the text content
                df = pd.DataFrame([["No tables found in document"], ["Raw Text:"], [content]], columns=["Info"])
                df.to_excel(writer, sheet_name="Info", index=False)
            else:
                # Process each found table
                for i, table in enumerate(tables):
                    try:
                        # Split table into rows
                        rows = [row for row in table.strip().split('\n') if row]
                        
                        if len(rows) < 2:
                            continue
                        
                        # Parse headers
                        header = rows[0]
                        headers = [col.strip() for col in header.split('|')[1:-1]]
                        
                        # Skip the separator row (|---|---|) and process data rows
                        data_rows = rows[2:] if len(rows) > 2 else []
                        
                        # Parse data
                        data = []
                        for row in data_rows:
                            cols = [col.strip() for col in row.split('|')[1:-1]]
                            # If we have more/fewer columns than headers, adjust
                            while len(cols) < len(headers):
                                cols.append("")
                            data.append(cols[:len(headers)])
                        
                        # Create DataFrame
                        df = pd.DataFrame(data, columns=headers)
                        
                        # Write to Excel
                        sheet_name = f"Table_{i+1}"
                        df.to_excel(writer, sheet_name=sheet_name, index=False)
                    except Exception as table_error:
                        print(f"Error processing table {i+1}: {table_error}")
                
                # Add a sheet with the full content too
                df = pd.DataFrame([["Full Text Content:"], [content]], columns=["Content"])
                df.to_excel(writer, sheet_name="Full_Text", index=False)
        
        print(f"Successfully created Excel file: {excel_file}")
        return excel_file
    except Exception as e:
        print(f"Error creating Excel file: {e}")
        print(traceback.format_exc())
        return None


# Main function to handle command-line arguments
def main():
    # Print debug info
    print(f"Python version: {sys.version}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Arguments: {sys.argv}")
    
    if len(sys.argv) < 2:
        print("Usage: python extract.py input_file [output_md_file] [output_excel_file]")
        return 1
    
    input_file = sys.argv[1]
    output_md = sys.argv[2] if len(sys.argv) > 2 else "output.md"
    output_excel = sys.argv[3] if len(sys.argv) > 3 else None
    
    print(f"Processing: {input_file} -> {output_md} -> {output_excel}")
    
    try:
        # Check if input file exists
        if not os.path.exists(input_file):
            print(f"Error: Input file not found: {input_file}")
            return 1
            
        # Extract text from file
        result = extract_text_from_file(input_file)
        
        # Write the extracted Markdown to output file
        try:
            with open(output_md, "w", encoding="utf-8") as f:
                f.write(result)
            print(f"Text extracted and written to {output_md}")
        except Exception as write_error:
            print(f"Error writing markdown file: {write_error}")
            return 1
        
        # Convert the Markdown file to Excel
        excel_file = markdown_to_excel(output_md, output_excel)
        if excel_file:
            print(f"Excel file created: {excel_file}")
            return 0
        else:
            print("Failed to create Excel file.")
            return 1
    except Exception as e:
        print(f"Error in main function: {str(e)}")
        print(traceback.format_exc())
        return 1


if __name__ == "__main__":
    sys.exit(main())