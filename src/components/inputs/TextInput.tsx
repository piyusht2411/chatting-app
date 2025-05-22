const TextInput = ({
  type = "text",
  placeholder,
  value,
  setValue,
}: {
  type?: string;
  placeholder: string;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
}) => {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
      }}
      placeholder={placeholder}
      className="w-full border border-gray-400 outline-none px-3 py-2 rounded-md text-sm"
    />
  );
};

export default TextInput;
