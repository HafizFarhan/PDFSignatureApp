import React, { useEffect, useRef } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

// Set the worker source for pdfjs-dist to the specified URL
GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

const useRenderPDF = (
  pdfData,
  scale,
  setPdfViewerHeight,
  onCanvasRendered,
  setPageHeights,
  setPages
) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const renderPDF = async () => {
      if (!pdfData) return;

      const loadingTask = getDocument({ data: pdfData.slice(0) });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      console.log(`Number of pages: ${numPages}`);

      const container = containerRef.current;
      container.innerHTML = "";

      const devicePixelRatio = window.devicePixelRatio || 1;
      let totalHeight = 0;
      const pageHeights = [];
      const pages = [];

      for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        // Set canvas dimensions to match the PDF page dimensions
        const canvasWidth = viewport.width;
        const canvasHeight = viewport.height;
        canvas.width = canvasWidth * devicePixelRatio;
        canvas.height = canvasHeight * devicePixelRatio;
        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;
        canvas.style.border = "1px solid #000"; // Add border style
        context.scale(devicePixelRatio, devicePixelRatio);

        container.appendChild(canvas);

        const renderContext = {
          canvasContext: context,
          viewport,
        };

        await page.render(renderContext).promise;

        totalHeight += canvasHeight; // Accumulate total height
        pageHeights.push(canvasHeight); // Store canvas height
        pages.push(page); // Store page object

        console.log(`Rendered page ${pageNumber}`);
      }

      setPdfViewerHeight(totalHeight * devicePixelRatio);
      setPageHeights(pageHeights);
      setPages(pages); // Set pages state

      // Notify all canvases rendered
      onCanvasRendered(container.getBoundingClientRect());
    };

    renderPDF();
  }, [
    pdfData,
    scale,
    setPdfViewerHeight,
    onCanvasRendered,
    setPageHeights,
    setPages,
  ]);

  return containerRef;
};

const PdfViewer = ({
  pdfData,
  scale,
  setPdfViewerHeight,
  onCanvasRendered,
  setPageHeights,
  setPages,
}) => {
  const containerRef = useRenderPDF(
    pdfData,
    scale,
    setPdfViewerHeight,
    onCanvasRendered,
    setPageHeights,
    setPages
  );

  return (
    <div
      ref={containerRef}
      className="pdf-viewer"
      style={{
        overflow: "auto",
        border: "2px solid #ccc",
        borderRadius: "8px",
      }}
    />
  );
};

export default PdfViewer;
