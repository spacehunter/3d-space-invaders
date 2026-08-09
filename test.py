import os

def list_files_descending(directory):
    # Get all file paths in the directory
    file_paths = [os.path.join(directory, f) for f in os.listdir(directory)]
    
    # Sort the file paths based on their last modification time
    file_paths.sort(key=os.path.getmtime, reverse=True)
    
    # Print the sorted file paths
    for path in file_paths:
        print(path)

# Example usage
directory = './'
list_files_descending(directory)

