import React, { useState } from "react";
import axios from "axios";

const LabTechDashboard = () => {
  const [file, setFile] = useState(null);

  const onFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("testResult", file);

    try {
      const res = await axios.post("/api/v1/tests/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log(res.data);
    } catch (err) {
      console.error(err.response.data);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-5">Upload Test Result</h2>
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <input type="file" onChange={onFileChange} className="w-full" />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
        >
          Upload
        </button>
      </form>
    </div>
  );
};

export default LabTechDashboard;
