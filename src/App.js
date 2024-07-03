import React, { useState, useRef, useMemo, useEffect } from "react";
import PdfViewer from "./components/PdfViewer";
import SignaturePadComponent from "./components/SignaturePadComponent";
import TextInputComponent from "./components/TextInputComponent";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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
  const [textVisible, setTextVisible] = useState(false);
  const [canvasBounds, setCanvasBounds] = useState(null);
  const [scale, setScale] = useState(1.5);
  const [pageHeights, setPageHeights] = useState([]);
  const [pageWidths, setPageWidths] = useState([]);
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [canvasWidth, setCanvasWidth] = useState(0); // New state to store canvas width
  const canvasRef = useRef(null);
  const [pdfViewerHeight, setPdfViewerHeight] = useState(0);
  const [scrolling, setScrolling] = useState(false);
  const [pdfViewerWidth, setPdfViewerWidth] = useState(0);
  const [pages, setPages] = useState([]);
  const [pageMargin, setPageMargin] = useState(0);
  const [textAnnotations, setTextAnnotations] = useState([]);

  useEffect(() => {
    console.log("currentPageNumber updated:", currentPageNumber);
  }, [currentPageNumber]);

  const onFileChange = (event) => {
    if (pageWidths[0] > 1000) {
      setPageMargin(15);
    } else {
      setPageMargin(30);
    }
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        setPdfFile(URL.createObjectURL(file));
        setPdfData(new Uint8Array(arrayBuffer));

        setSignature(null);
        setSignatureVisible(false);
        setTextVisible(false);
        setSignaturePosition({ x: 0, y: 0 });
        setSignatureSize({ width: 100, height: 50 });
        setShowSignaturePad(false);
        setCanvasBounds(null);
        setPageHeights([]);
        setPageWidths([]);
        setCurrentPageNumber(1);
        setPages([]);
        setTextAnnotations([]);
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

  const handleAddTextAnnotation = (position) => {
    setTextAnnotations([...textAnnotations, position]);
    setTextVisible(true);
  };

  const handleDeleteTextAnnotation = (index) => {
    const updatedAnnotations = [...textAnnotations];
    updatedAnnotations.splice(index, 1);
    setTextAnnotations(updatedAnnotations);
  };

  const handleDrag = (e, data) => {
    const { x, y } = data;

    const containerRect = canvasRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;

    const firstPageWidth = pages.length > 0 ? pages[0].width : 1;
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

    // Update signature position state
    setSignaturePosition({ x, y });
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
      if (!pdfData) {
        console.error("PDF data is missing.");
        return;
      } else {
        if (!signature && !textAnnotations) {
          console.error("Must add signature or annotations");
          return;
        }
      }
      console.log("Adding signature to PDF...");

      const pdfDoc = await PDFDocument.load(pdfData);

      const targetPageIndex = currentPageNumber - 1;

      console.log("index of signature", targetPageIndex);
      const targetPage = pdfDoc.getPage(targetPageIndex);

      const pdfPageHeight = pageHeights[targetPageIndex];
      const pdfPageWidth = pageWidths[targetPageIndex];

      const containerRect = canvasRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;

      const page = pdfDoc.getPage(0);
      const width = page.getWidth();
      const height = page.getHeight();
      console.log(`Page size: ${width} x ${height} points`);

      if (signature) {
        const pngImage = await pdfDoc.embedPng(signature);

        // Adjusted Y position for signature based on stored page
        const YforMulti = signaturePosition.y - targetPageIndex * pdfPageHeight;
        const downloadX = width * (signaturePosition.x / (pdfPageWidth / 2));
        const newYPos =
          pdfPageHeight - (YforMulti + signatureSize.height * scale * 0.5);
        const downloadY = height * (newYPos / pdfPageHeight);

        // Draw the signature image on the target page at the calculated position
        targetPage.drawImage(pngImage, {
          x: downloadX,
          y: downloadY + 13,
          width: signatureSize.width * scale * 0.5,
          height: signatureSize.height * scale * 0.5,
        });
      }

      // Add text annotations to PDF
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      for (let i = 0; i < textAnnotations.length; i++) {
        const annotation = textAnnotations[i];
        const { x, y, text } = annotation;

        var pageNo = Math.floor(y / pageHeights[0]);
        console.log("some division : ", pageNo);

        console.log("curret page for text", pageNo);

        // Adjusted Y position for text annotation based on stored page
        const adjustedY =
          height *
          ((pdfPageHeight - (y - pageNo * pdfPageHeight + scale * 0.5)) /
            pdfPageHeight);

        console.log("index of text", pageNo);
        const targetPageText = pdfDoc.getPage(pageNo);
        targetPageText.drawText(text, {
          x: width * (x / (pdfPageWidth / 2)),
          y: adjustedY,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      }

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
        setPageWidths={setPageWidths}
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
      setPageWidths,
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
          <button
            className="button add-annotation-button"
            onClick={() => handleAddTextAnnotation({ x: 50, y: 50, text: "" })}
          >
            Add Annotation
          </button>
          {(signatureVisible || textVisible) && (
            <button
              className="button save-pdf-button"
              onClick={addSignatureToPdf}
            >
              Save PDF
            </button>
          )}
        </div>
      </div>
      <div
        className="pdf-canvas"
        ref={canvasRef}
        style={{
          position: "relative",
          marginTop: "20px",
          width: `${pageWidths[0] + 6}px`,
          marginLeft: `${pageMargin}%`,
        }}
      >
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

        {textAnnotations.map((annotation, index) => (
          <TextInputComponent
            key={index}
            position={{ x: annotation.x, y: annotation.y }}
            onChange={(newPosition) =>
              setTextAnnotations((prevState) =>
                prevState.map((item, i) => (i === index ? newPosition : item))
              )
            }
            onDelete={() => handleDeleteTextAnnotation(index)}
          />
        ))}
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
