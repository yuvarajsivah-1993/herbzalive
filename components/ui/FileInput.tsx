
import React, { useState, ChangeEvent } from 'react';

interface FileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const FileInput: React.FC<FileInputProps> = ({ label, id, ...props }) => {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPreview(URL.createObjectURL(file));
      if (props.onChange) {
        props.onChange(e);
      }
    } else {
        setPreview(null);
    }
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <div className="mt-1 flex items-center space-x-4">
        <span className="h-16 w-16 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          {preview ? (
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <svg className="h-12 w-12 text-slate-400 dark:text-slate-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </span>
        <label
          htmlFor={id}
          className="cursor-pointer rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-sm font-medium leading-4 text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          <span>Change</span>
          <input id={id} name={id} type="file" className="sr-only" accept="image/*" {...props} onChange={handleFileChange} />
        </label>
      </div>
    </div>
  );
};

export default FileInput;
