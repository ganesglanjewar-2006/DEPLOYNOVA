import { HiOutlineXMark } from "react-icons/hi2";

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>
            <HiOutlineXMark />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
