import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext.jsx";

const PatientDashboard = () => {
  const [testResults, setTestResults] = useState([]);
  const { auth } = useContext(AuthContext);

  useEffect(() => {
    const fetchTestResults = async () => {
      try {
        const res = await axios.get(`/api/v1/tests?patientId=${auth.user.id}`);
        setTestResults(res.data);
      } catch (err) {
        console.error(err.response.data);
      }
    };

    if (auth) {
      fetchTestResults();
    }
  }, [auth]);

  return (
    <div>
      <h2 className="text-xl font-bold mb-5">Your Test Results</h2>
      <ul>
        {testResults.map((result) => (
          <li key={result._id} className="mb-2 p-2 border rounded-lg">
            <p>
              <strong>Test Name:</strong> {result.testName}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PatientDashboard;
