import React, { useEffect, useRef } from 'react';
import { Markmap } from 'markmap-view';
import { transformer } from '../lib/markmap';
import { Toolbar } from 'markmap-toolbar';
import 'markmap-toolbar/dist/style.css';

interface MarkmapMindmapProps {
  markdown: string;
}

export default function MarkmapMindmap({ markdown }: MarkmapMindmapProps) {
  const refSvg = useRef<SVGSVGElement | null>(null);
  const refMm = useRef<Markmap | null>(null);
  const refToolbar = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!refMm.current && refSvg.current) {
      const mm = Markmap.create(refSvg.current, {
        autoFit: true,
        initialExpandLevel: 3,
      });
      refMm.current = mm;
    }
  }, []);

  useEffect(() => {
    if (refMm.current) {
      const { root } = transformer.transform(markdown);
      refMm.current.setData(root).then(() => {
        if (refMm.current) {
          refMm.current.fit();
        }
      });
    }
  }, [markdown]);

  // Function to fetch the template, insert markdown, and trigger file download.
  const downloadMindmap = async () => {
    try {
      const response = await fetch('/template.html');
      if (!response.ok) {
        throw new Error(
          'Failed to fetch template.html. Make sure it is placed in the public folder.'
        );
      }
      const template = await response.text();
      const htmlContent = template.replace('{{MARKDOWN_CONTENT}}', markdown);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mindmap.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // Function to open the generated mindmap HTML in a new tab.
  const openMindmap = async () => {
    try {
      const response = await fetch('/template.html');
      if (!response.ok) {
        throw new Error(
          'Failed to fetch template.html. Ensure it is in the public folder.'
        );
      }
      const template = await response.text();
      const htmlContent = template.replace('{{MARKDOWN_CONTENT}}', markdown);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Optionally, revoke the URL after a delay.
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      console.error('Open in new tab failed:', error);
    }
  };

  return (
    <div className="relative w-full h-full">
      <svg ref={refSvg} className="w-full h-full"></svg>
      <div ref={refToolbar} className="absolute bottom-4 right-4"></div>
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={openMindmap}
          className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          {/* New Tab Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
          Open in New Tab
        </button>
        <button
          onClick={downloadMindmap}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {/* Download Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3"
            />
          </svg>
          Download HTML
        </button>
      </div>
    </div>
  );
}
