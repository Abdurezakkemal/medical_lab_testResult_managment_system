import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import AdminDashboard from "../components/AdminDashboard";
import DoctorDashboard from "../components/DoctorDashboard";
import LabTechDashboard from "../components/LabTechDashboard";
import PatientDashboard from "../components/PatientDashboard";

const DashboardPage = () => {
  const { auth } = useContext(AuthContext);

  if (
    !auth ||
    !auth.user ||
    !Array.isArray(auth.user.roles) ||
    auth.user.roles.length === 0
  ) {
    return <div>Loading...</div>;
  }

  const renderDashboard = () => {
    switch (auth.user.roles[0]) {
      case "Admin":
        return <AdminDashboard />;
      case "Doctor":
        return <DoctorDashboard />;
      case "Lab Tech":
        return <LabTechDashboard />;
      case "Patient":
        return <PatientDashboard />;
      default:
        return <div>Unknown role</div>;
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-5">Dashboard</h1>
      {renderDashboard()}
    </div>
  );
};

export default DashboardPage;
