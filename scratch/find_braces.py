
import sys

def find_mismatched_braces(filename, start_line, end_line):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    stack = []
    block = lines[start_line-1:end_line]
    
    for i, line in enumerate(block):
        line_num = start_line + i
        for char in line:
            if char == '{':
                stack.append(line_num)
            elif char == '}':
                if stack:
                    stack.pop()
                else:
                    print(f"Extra closing brace at line {line_num}")
    
    for line_num in stack:
        print(f"Unclosed opening brace from line {line_num}")

if __name__ == "__main__":
    find_mismatched_braces('public/index.html', 9075, 11479)
