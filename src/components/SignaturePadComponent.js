import React, { useRef, useEffect } from "react";
import SignaturePad from "signature_pad";

const SignaturePadComponent = ({ onEnd, onClear, onCreate, onClose }) => {
  const canvasRef = useRef(null);
  const signaturePadRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);

    const signaturePad = new SignaturePad(canvas);
    signaturePadRef.current = signaturePad;

    signaturePad.onEnd = () => {
      if (onEnd) onEnd(signaturePad.toDataURL());
    };

    return () => signaturePad.off();
  }, [onEnd]);

  const handleClear = () => {
    signaturePadRef.current.clear();
    if (onClear) onClear();
  };

  const handleCreate = () => {
    if (onCreate) onCreate(signaturePadRef.current.toDataURL());
  };

  return (
    <div className="signature-pad-container">
      <canvas
        ref={canvasRef}
        style={{ border: "1px solid #000", width: "100%", height: "200px" }}
      ></canvas>
      <div className="signature-pad-controls">
        <button onClick={handleClear}>Clear</button>
        <button onClick={handleCreate}>Create</button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default SignaturePadComponent;
