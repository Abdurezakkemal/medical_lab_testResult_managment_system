import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminDashboard = () => {
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const res = await axios.get("/api/v1/audit-logs");
        setAuditLogs(res.data);
      } catch (err) {
        console.error(err.response.data);
      }
    };

    fetchAuditLogs();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-5">Audit Logs</h2>
      <ul>
        {auditLogs.map((log) => (
          <li key={log._id} className="mb-2 p-2 border rounded-lg">
            <p>
              <strong>Action:</strong> {log.action}
            </p>
            <p>
              <strong>User:</strong> {log.user}
            </p>
            <p>
              <strong>Timestamp:</strong>{" "}
              {new Date(log.timestamp).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminDashboard;
