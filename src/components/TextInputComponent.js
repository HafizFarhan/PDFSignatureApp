import React, { useState } from "react";
import Draggable from "react-draggable";

const TextInputComponent = ({
  position,
  onChange,
  onDelete,
  defaultText = "",
}) => {
  const [text, setText] = useState(defaultText);

  const handleInputChange = (e) => {
    setText(e.target.value);
    // Update position with new text value
    if (onChange) {
      onChange({ ...position, text: e.target.value });
    }
  };

  // Update position on drag
  const handleDrag = (e, data) => {
    const { x, y } = data;
    console.log("Text Drag position : ", x, y);
    if (onChange) {
      onChange({ x, y, text });
    }
  };

  return (
    <Draggable position={{ x: position.x, y: position.y }} onDrag={handleDrag}>
      <div
        className="text-input-annotation"
        style={{
          position: "absolute",
          left: position.x,
          top: position.y,
          zIndex: 10,
        }}
      >
        <textarea
          value={text}
          onChange={handleInputChange}
          style={{ width: "200px", height: "80px" }}
        />
        <button onClick={onDelete}>Delete</button>
      </div>
    </Draggable>
  );
};

export default TextInputComponent;
