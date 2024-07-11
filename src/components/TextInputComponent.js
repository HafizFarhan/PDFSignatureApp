import React, { useState, useRef } from "react";
import Draggable from "react-draggable";
import "../App.css";

const TextInputComponent = ({
  position,
  onChange,
  onDelete,
  defaultText = "",
}) => {
  const [text, setText] = useState(defaultText);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditable, setIsEditable] = useState(false);

  const inputRef = useRef(null); // Ref for focusing the input

  const handleInputChange = (e) => {
    setText(e.target.value);
    if (onChange) {
      onChange({ ...position, text: e.target.value });
    }
  };

  const handleDoubleClick = () => {
    setIsEditable(true);
    inputRef.current.focus();
  };

  const handleDrag = (e, ui) => {
    var { x, y } = ui;
    x = x ;
    console.log("curser position : ", x, " ", y);
    if (!isEditable) {
      // Update the position state with the new cursor position
      onChange({ x, y, text });
    }
  };

  const handleDragStop = () => {
    setIsDragging(false);
  };

  const toggleEdit = () => {
    setIsEditable(!isEditable);
  };

  const handleInputBlur = () => {
    setIsEditable(false); // Set editable to false when input blurs
  };

  return (
    <Draggable
      position={{ x: position.x, y: position.y }}
      onDrag={handleDrag}
      onStop={handleDragStop}
      bounds="parent"
    >
      <div
        className="text-input-annotation"
        style={{
          position: "absolute",
          left: position.x,
          top: position.y,
          zIndex: 10,
          cursor: isDragging ? "move" : isEditable ? "text" : "move",
        }}
      >
        <input
          ref={inputRef}
          type="date"
          value={text}
          onChange={handleInputChange}
          onDoubleClick={handleDoubleClick}
          onBlur={handleInputBlur}
          style={{
            width: "200px",
            height: "35px",
            cursor: isEditable ? "text" : "move",
            border: isEditable ? "1px solid #ccc" : "none",
            padding: "5px",
            pointerEvents: isEditable ? "auto" : "none",
          }}
        />

        <button
          className="edit-button"
          onClick={toggleEdit}
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            transform: "translate(-15%, -140%)",
            cursor: "pointer",
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            display: isEditable ? "none" : "block",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="26"
            height="26"
            fill="currentColor"
            className="bi bi-pencil"
            viewBox="0 0 20 20"
          >
            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325" />
          </svg>
        </button>

        <button
          className="delete-button"
          onClick={onDelete}
          style={{
            position: "absolute",
            top: "0",
            right: "0",
            transform: "translate(25%, -120%)",
            cursor: "pointer",
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            display: isEditable ? "none" : "block",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            fill="currentColor"
            className="bi bi-x"
            viewBox="0 0 16 16"
          >
            <path d="M11.354 4.646a.5.5 0 0 0-.708 0L8 7.293 5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 1 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0 0-.708z" />
          </svg>
        </button>
      </div>
    </Draggable>
  );
};

export default TextInputComponent;
