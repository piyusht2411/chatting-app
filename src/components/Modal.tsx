import { ReactNode } from "react";

// This is the modal...
const Modal = ({
  children,
  isOpen,
  setIsOpen,
}: {
  children: ReactNode;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <div
      onClick={() => {
        setIsOpen(false);
      }}
      className={`w-full h-screen fixed top-0 left-0  z-[60] flex items-center justify-center ${
        !isOpen && "hidden"
      }`}
      style={{
        backgroundColor: "rgba(115, 115, 115, 0.5)",
      }}
    >
      {children}
    </div>
  );
};

export default Modal;
