import React from "react";

function CustomButton({ onClick, label }) {
  return (
    <li>
      <button onClick={onClick}>{label}</button>
    </li>
  );
}

export default CustomButton;
