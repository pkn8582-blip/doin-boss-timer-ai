import React, { useEffect } from 'react';

interface ImageUploaderProps {
  files: File[];
  onFilesSelected: (files: File[]) => void;
  isLoading: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ files, onFilesSelected, isLoading }) => {
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files).slice(0, 10); // Max 10 files
      onFilesSelected(selectedFiles);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onFilesSelected(newFiles);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isLoading) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            pastedFiles.push(file);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        
        const remainingSlots = 10 - files.length;
        
        if (remainingSlots <= 0) {
          alert("이미지는 최대 10장까지만 등록할 수 있습니다.");
          return;
        }

        const filesToAdd = pastedFiles.slice(0, remainingSlots);
        const newFileList = [...files, ...filesToAdd];
        onFilesSelected(newFileList);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [files, onFilesSelected, isLoading]);

  return (
    <div className="w-full max-w-md mx-auto mb-6">
      <div className="relative border-2 border-dashed border-slate-600 rounded-lg p-6 hover:border-amber-500 transition-colors bg-slate-800/50">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          disabled={isLoading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
        />
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-slate-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-4 flex justify-center text-sm text-slate-300">
            <span className="relative cursor-pointer rounded-md font-medium text-amber-500 hover:text-amber-400 focus-within:outline-none">
              <span>스크린샷 업로드</span>
            </span>
            <p className="pl-1">드래그 앤 드롭, 또는 붙여넣기(Ctrl+V)</p>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            최대 10장까지 (PNG, JPG, GIF)
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-5 gap-2">
          {files.map((file, index) => (
            <div key={index} className="relative group aspect-square bg-slate-800 rounded overflow-hidden border border-slate-700">
               {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img
                src={URL.createObjectURL(file)}
                className="object-cover w-full h-full opacity-80"
              />
              {!isLoading && (
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;