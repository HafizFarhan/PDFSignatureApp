import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import PdfViewer from "./components/PdfViewer";
import SignaturePadComponent from "./components/SignaturePadComponent";
import TextInputComponent from "./components/TextInputComponent";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import "./App.css";
import logo from "./logo2.svg";

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
  const [canvasWidth, setCanvasWidth] = useState(0);
  const canvasRef = useRef(null);
  const [pdfViewerHeight, setPdfViewerHeight] = useState(0);
  const [scrolling, setScrolling] = useState(false);
  const [pdfViewerWidth, setPdfViewerWidth] = useState(0);
  const [pages, setPages] = useState([]);
  const [pageMargin, setPageMargin] = useState(0);
  const [textAnnotations, setTextAnnotations] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);

  const [pdfPage, setPdfPage] = useState(null);

  // Handler to set the PDF page when the document is loaded
  const onDocumentLoadSuccess = (pdf) => {
    setPdfPage(pdf._pdfInfo);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Delete") {
        removeSignature();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [signatureVisible]);

  const removeSignature = useCallback(() => {
    setSignature(null);
    setSignatureVisible(false);
  }, []);
  useEffect(() => {
    console.log("currentPageNumber updated:", currentPageNumber);
  }, [currentPageNumber]);
  const onFileChange = async (event) => {
    if (pageWidths[0] > 1000) {
      setPageMargin(15);
    } else {
      setPageMargin(30);
    }
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
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

        const loadedPdfDoc = await PDFDocument.load(arrayBuffer);
        setPdfDoc(loadedPdfDoc);
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
    const containerHeight = containerRect.height;
    const firstPageWidth = pages.length > 0 ? pages[0].width : 1;
    const viewerScaleX = containerWidth / firstPageWidth;

    // Calculate the y-position relative to the accumulated heights of pages
    let accumulatedHeight = 0;
    let targetPageIndex = 0;

    // Find the target page index based on current drag position
    for (let i = 0; i < pageHeights.length; i++) {
      const viewerPageHeight = pageHeights[i] * 0.182 * 10;

      // Check if the current y-position is within this page's accumulated height
      if (y < accumulatedHeight + viewerPageHeight) {
        targetPageIndex = i; // Page index where signature is being dragged
        break;
      }

      accumulatedHeight += viewerPageHeight;
    }

    // Access the pre-loaded PDF document from state
    if (pdfDoc) {
      const page = pdfDoc.getPage(0);
      const width = page.getWidth();
      const height = page.getHeight();
      const pdfPageHeight = pageHeights[0];
      const pdfPageWidth = pageWidths[0];

      // Calculate the new x coordinate by scaling it based on the width of the PDF page and the container width
      // const temp = (pdfPageWidth / 2) * (x / width);

      console.log(`Container height: ${containerHeight}`);
      console.log(`PDF Page Height: ${height}`);
      // console.log(`Original X: ${x}`);
      // console.log("percentage curser ", x / width);
      // console.log("x:", x, "temp:", temp); // Debugging line to check values

      // Update current page number state
      setCurrentPageNumber(targetPageIndex + 1);

      // console.log(`X ${x}`);

      // const temp = x;
      // Update signature position state with the scaled x coordinate
      setSignaturePosition({ x: x / 10, y: y / 10 });

      console.log(`position ${signaturePosition.y}`);
    }
  };

  const handleResize = (e, { size }) => {
    setSignatureSize({ width: size.width, height: size.height });
  };

 
  // const removeSignature = () => {
  //   setSignature(null);
  //   setSignatureVisible(false);
  // };

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

      // console.log(signaturePosition.x * 10);
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

        console.log("pdf page height ", pdfPageHeight);

        // Adjusted Y position for signature based on stored page
        const YforMulti =
          signaturePosition.y - targetPageIndex * (pdfPageHeight * 0.182);

        // Calculate X position for the signature in the PDF
        const scaledSignatureX = signaturePosition.x * 10;
        const downloadX = width * (scaledSignatureX / pdfPageWidth);
        const finalX = downloadX * 1.08;

        // Calculate Y position for the signature in the PDF
        const normalizedY = YforMulti / (pdfPageHeight * 0.182);
        const downloadY = height * normalizedY;
        const invertedY = height - downloadY;
        const signatureHeightScaled = signatureSize.height * scale * 0.5;
        const finalY = invertedY - signatureHeightScaled;

        console.log("finalX", finalX);
        console.log("finalY", finalY);

        // Draw the signature image on the target page at the calculated position
        targetPage.drawImage(pngImage, {
          x: finalX * 1.01,
          y: finalY * 1.06,
          width: signatureSize.width * scale * 0.5,
          height: signatureSize.height * scale * 0.5,
        });
      }

      // Add text annotations to PDF
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      for (let i = 0; i < textAnnotations.length; i++) {
        const annotation = textAnnotations[i];
        const { x, y, text } = annotation;

        console.log("date index : ", x, " ", y);
        var pageNo = Math.floor(y / pageHeights[0]);
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
      <div className="navbar">
        <div><img src={logo}></img></div>
        
        <div className="top-buttons">
            <input className="custom-file-input" type="file" onChange={onFileChange} accept="application/pdf"/>
            <button   className="button add-signature-button" onClick={() => setShowSignaturePad(true)} >
              Add Signature
            </button>
            <button className="button add-annotation-button" onClick={() =>  handleAddTextAnnotation({ x: 50, y: 50, text: "" }) } >
              Add Date
            </button>
            {(signatureVisible || textVisible) && (
              <button
                className="button save-pdf-button"
                onClick={addSignatureToPdf}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="feather feather-save"
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l2 3h5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                <span style={{ marginLeft: "5px" }}>Save PDF</span>
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
        {/* Your PDF viewer and annotations rendering */}
        {pdfFile && memoizedPdfViewer}
        {signatureVisible && (
          <Draggable
            defaultPosition={signaturePosition}
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
                 <div
                    style={{
                      position: "absolute",
                      top: -20,
                      right: -20,
                      cursor: "pointer",
                      backgroundColor: "rgba(255, 255, 255, 0.7)",
                      borderRadius: "50%",
                      padding: "5px",
                    }}
                    onClick={removeSignature}
                  >
                    
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </div>
              </ResizableBox>
            </div>
          </Draggable>
        )}
        {/* Render text annotations */}
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
      {/* Signature pad overlay */}
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
