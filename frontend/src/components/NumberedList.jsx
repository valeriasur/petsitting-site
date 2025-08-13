import React from "react";
import "./NumberedList.css";
import PropTypes from "prop-types";

function NumberedList({ items }) {
  return (
    <ol>
      {items.map((item, index) => (
        <li key={index}>
          <span>{index + 1}.</span>
          <img src={item.imageUrl} alt={`Изображение ${index + 1}`} />
          <span>{item.text}</span>
        </li>
      ))}
    </ol>
  );
}

NumberedList.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      imageUrl: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default NumberedList;
