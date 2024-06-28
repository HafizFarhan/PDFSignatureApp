import React, { useState, useRef, useMemo, useEffect } from "react";
import PdfViewer from "./components/PdfViewer";
import SignaturePadComponent from "./components/SignaturePadComponent";
import { PDFDocument } from "pdf-lib";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import "./App.css";

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [signature, setSignature] = useState(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signaturePosition, setSignaturePosition] = useState({ x: 0, y: 0 });
  const [signatureSize, setSignatureSize] = useState({
    width: 100,
    height: 50,
  });
  const [signatureVisible, setSignatureVisible] = useState(false);
  const [canvasBounds, setCanvasBounds] = useState(null);
  const [scale, setScale] = useState(1.5);
  const [pageHeights, setPageHeights] = useState([]);
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const canvasRef = useRef(null);
  const [pdfViewerHeight, setPdfViewerHeight] = useState(0);
  const [scrolling, setScrolling] = useState(false);
  const [pdfViewerWidth, setPdfViewerWidth] = useState(0);
  const [pages, setPages] = useState([]);

  useEffect(() => {
    console.log("currentPageNumber updated:", currentPageNumber);
  }, [currentPageNumber]);

  const onFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        setPdfFile(URL.createObjectURL(file));
        setPdfData(new Uint8Array(arrayBuffer));

        // Reset state variables to initial values
        setSignature(null);
        setSignatureVisible(false);
        setSignaturePosition({ x: 0, y: 0 });
        setSignatureSize({ width: 100, height: 50 });
        setShowSignaturePad(false);
        setCanvasBounds(null);
        setPageHeights([]);
        setCurrentPageNumber(1); // Reset current page number
        setPages([]); // Reset pages state
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleSignatureEnd = (dataUrl) => {
    setSignature(dataUrl);
  };

  const handleCreateSignature = (dataUrl) => {
    setSignature(dataUrl);
    setShowSignaturePad(false);
    setSignatureVisible(true);
  };
  const handleDrag = (e, data) => {
    const { x, y } = data;

    // Get the dimensions of the PDF viewer container
    const containerRect = canvasRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;

    // Calculate the scaling factor based on the first page dimensions
    const firstPageWidth = pages.length > 0 ? pages[0].width : 1; // Fallback width to avoid division by zero
    const viewerScaleX = containerWidth / firstPageWidth;

    // Calculate the y-position relative to the accumulated heights of pages
    let accumulatedHeight = 0;
    let targetPageIndex = 0;

    // Find the target page index based on current drag position
    for (let i = 0; i < pageHeights.length; i++) {
      const viewerPageHeight = pageHeights[i];

      // Check if the current y-position is within this page's accumulated height
      if (y < accumulatedHeight + viewerPageHeight) {
        targetPageIndex = i; // Page index where signature is being dragged
        break;
      }

      accumulatedHeight += viewerPageHeight;
    }

    // Update current page number state
    setCurrentPageNumber(targetPageIndex + 1);

    // Calculate the scaled coordinates relative to the PDF page
    const page = pages[targetPageIndex];
    const pageHeight = page.height;
    const viewerScaleY = viewerScaleX; // Assuming uniform scaling

    // Adjust the position to account for the accumulated height of previous pages
    let offsetY = (y - accumulatedHeight) / viewerScaleX; // Adjusted Y position relative to current page
    offsetY = pageHeight - offsetY; // Flip Y-axis to match PDF coordinates

    // Update signature position state
    setSignaturePosition({ x, y });

    console.log("Drag position:", x, y);
    console.log("Page index:", targetPageIndex + 1);
  };

  const handleResize = (e, { size }) => {
    setSignatureSize({ width: size.width, height: size.height });
  };

  const deleteSignature = () => {
    setSignature(null);
    setSignatureVisible(false);
  };

  const scrollPageDown = () => {
    window.scrollBy(0, 50);
    setTimeout(() => {
      setScrolling(false);
    }, 100);
  };

  const addSignatureToPdf = async () => {
    try {
      if (!pdfData || !signature) {
        console.error("PDF data or signature image is missing.");
        return;
      }

      console.log("Adding signature to PDF...");

      // Load the PDF document from the pdfData buffer
      const pdfDoc = await PDFDocument.load(pdfData);

      // Embed the signature image (PNG format) into the PDF document
      const pngImage = await pdfDoc.embedPng(signature);

      // Get the dimensions of the PDF viewer container
      const containerRect = canvasRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;

      const targetPageIndex = currentPageNumber - 1; // Convert to 0-based index
      const targetPage = pdfDoc.getPage(targetPageIndex); // Get the target page

      const pageHeight = targetPage.getHeight();
      const pageWidth = targetPage.getWidth();
      const viewerScaleX = containerWidth / pageWidth;
      const viewerScaleY = viewerScaleX;

      const pdfViewerHeight = 612;
      const pdfDownloadHeight = 780;

      const max = 795 * (containerWidth / 1700);
      const spare = (max - 400) / 2;
      const percentageX = (signaturePosition.x - spare) / 400;

      const percentageY = signaturePosition.y / pdfViewerHeight;

      var downloadX = percentageX * 600 - 18;
      var downloadY = (1 - percentageY) * pdfDownloadHeight;
      if (percentageX > 0.5) {
        downloadX = percentageX * 600 - 50;
      }
      // Adjust the position to account for the accumulated height of previous pages
      let accumulatedHeight = 0;
      for (let i = 0; i < targetPageIndex; i++) {
        const page = pdfDoc.getPage(i);
        accumulatedHeight +=
          (page.getHeight() * containerWidth) / page.getWidth();
      }

      // Draw the signature image on the target page at the calculated position
      targetPage.drawImage(pngImage, {
        x: downloadX,
        y: downloadY - 4,
        width: signatureSize.width * scale * 0.6,
        height: signatureSize.height * scale * 0.6,
      });

      // Save the modified PDF document and create a blob for downloading
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "signed_document.pdf";

      // Trigger the download of the modified PDF document
      link.click();

      console.log("Signature successfully added to PDF.");
    } catch (error) {
      console.error("Error adding signature to PDF:", error);
    }
  };

  // Memoize PdfViewer component to prevent unnecessary re-renders
  const memoizedPdfViewer = useMemo(
    () => (
      <PdfViewer
        pdfData={pdfData}
        scale={scale}
        setPdfViewerWidth={setPdfViewerWidth}
        setPdfViewerHeight={setPdfViewerHeight}
        onCanvasRendered={setCanvasBounds}
        setPageHeights={setPageHeights}
        setPages={setPages}
      />
    ),
    [
      pdfData,
      scale,
      setPdfViewerWidth,
      setPdfViewerHeight,
      setCanvasBounds,
      setPageHeights,
      setPages,
    ]
  );

  return (
    <div className="App">
      <div className="top-buttons">
        <div className="button-container">
          <input
            className="custom-file-input"
            type="file"
            onChange={onFileChange}
            accept="application/pdf"
          />
          <button
            className="button add-signature-button"
            onClick={() => setShowSignaturePad(true)}
          >
            Add Signature
          </button>
          {signatureVisible && (
            <button
              className="button save-pdf-button"
              onClick={addSignatureToPdf}
            >
              Save PDF with Signature on Page 2
            </button>
          )}
        </div>
      </div>
      <div ref={canvasRef} style={{ position: "relative", marginTop: "20px" }}>
        {pdfFile && memoizedPdfViewer}
        {signatureVisible && (
          <Draggable
            position={signaturePosition}
            onDrag={handleDrag}
            onStop={handleDrag}
            bounds="parent"
          >
            <div
              style={{
                position: "absolute",
                left: signaturePosition.x,
                top: signaturePosition.y,
                cursor: "move",
                zIndex: 100,
              }}
            >
              <ResizableBox
                width={signatureSize.width}
                height={signatureSize.height}
                minConstraints={[50, 25]}
                maxConstraints={[300, 150]}
                onResize={handleResize}
                resizeHandles={["s", "w", "e", "n", "sw", "nw", "se", "ne"]}
                style={{ position: "relative" }}
              >
                <img
                  src={signature}
                  alt="Signature"
                  style={{
                    width: "100%",
                    height: "100%",
                    cursor: "move",
                  }}
                />
              </ResizableBox>
            </div>
          </Draggable>
        )}
      </div>
      {showSignaturePad && (
        <div className="signature-pad-overlay">
          <SignaturePadComponent
            onEnd={handleSignatureEnd}
            onCreate={handleCreateSignature}
            onClose={() => setShowSignaturePad(false)}
          />
        </div>
      )}
    </div>
  );
}

export default App;
