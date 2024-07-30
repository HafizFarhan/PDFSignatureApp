import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import PdfViewer from "./components/PdfViewer";
import SignaturePadComponent from "./components/SignaturePadComponent";
import TextInputComponent from "./components/TextInputComponent";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import "react-resizable/css/styles.css";
import { Rnd } from "react-rnd";
import "./App.css";
import logo from "./logo2.svg";
import debounce from "lodash/debounce";
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
  const canvasRef = useRef(null);
  const [pdfViewerHeight, setPdfViewerHeight] = useState(0);
  // const [scrolling, setScrolling] = useState(false);
  const [pdfViewerWidth, setPdfViewerWidth] = useState(0);
  const [pages, setPages] = useState([]);
  const [pageMargin, setPageMargin] = useState(0);
  const [textAnnotations, setTextAnnotations] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);

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
  const handleDrag = useCallback(debounce((e, data) => {
    const { x, y } = data;
  
    requestAnimationFrame(() => {
      if (pdfDoc) {
        const page = pdfDoc.getPage(0);
        // const width = page.getWidth();
        // const height = page.getHeight();
  
        const targetPageIndex = pageHeights.findIndex((pageHeight, index) => {
          const accumulatedHeight = pageHeights
            .slice(0, index)
            .reduce((sum, height) => sum + height * 0.182 * 10, 0);
          return y < accumulatedHeight + pageHeight * 0.182 * 10;
        });
  
        setCurrentPageNumber(targetPageIndex + 1);
        setSignaturePosition({ x: x / 10, y: y / 10 });
      }
    });
  }, 100),[pdfDoc, pageHeights]);


  const handleResize = (e, { size }) => {
    setSignatureSize({ width: size.width, height: size.height });
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
        const finalX = downloadX;

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
          x: finalX,
          y: finalY * 1.01,
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
        <div><img className="logo" src={logo} alt="INBOXACCEL"></img></div>
        
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
           <Rnd
           default={{
             x: signaturePosition.x,
             y: signaturePosition.y,
             width: signatureSize.width,
             height: signatureSize.height,
           }}
           minWidth={50}
           minHeight={25}
           maxWidth={300}
           maxHeight={150}
           bounds="parent"
           onDragStop={(e, data) => {
             setSignaturePosition({ x: data.x, y: data.y });
             handleDrag(e, data); 
           }}
           onResizeStop={(e, direction, ref, delta, position) => {
             setSignatureSize({
               width: ref.offsetWidth,
               height: ref.offsetHeight,
             });
             setSignaturePosition(position); 
             handleResize(e, { size: { width: ref.offsetWidth, height: ref.offsetHeight } });
           }}
           className="signature-rnd"
           
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
               top: -25,
               right: -25,
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
         </Rnd>
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
