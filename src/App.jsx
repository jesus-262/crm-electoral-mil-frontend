import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { jwtDecode } from "jwt-decode";
import Header from './component/Header'
import Index from './component/pages/Index'
import Login from './component/pages/Login'
import Register from './component/pages/Register'
import PrivateRoute from './component/PrivateRoute';
import Admin from './component/pages/Admin'
import EditarUsuario from './component/pages/EditarUsuario'
import Grafica from './component/pages/Grafica'
import ConsultasUsuario from './component/ConsultasUsuario'
import PresidencialesApp from './escrutinio/PresidencialesApp.jsx'
import ConcejoApp from './escrutinio/ConcejoApp.jsx'

function App() {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const hideHeader = ['/login'].includes(location.pathname);

  return (
    <>
      {!hideHeader && <Header />}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/Grafica" element={<Grafica/>} />
        <Route
          path="/login"
          element={
            token ? <Navigate to="/" replace /> : <Login />
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute allowedRoles={["Administrador"]}>
              <Admin />
            </PrivateRoute>
          }
        />
        <Route
          path="/UsuariosRegistrados/:userId"
          element={
            <PrivateRoute allowedRoles={["Administrador"]}>
              <ConsultasUsuario />
            </PrivateRoute>
          }
        />
        <Route
          path="/EditarUsuario/:userId"
          element={
            <PrivateRoute allowedRoles={["Administrador"]}>
              <EditarUsuario />
            </PrivateRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PrivateRoute allowedRoles={["Administrador"]}>
              <Register />
            </PrivateRoute>
          }
        />
        <Route
          path="/funcionario"
          element={
            <PrivateRoute allowedRoles={["Lider"]}>
              <Index />
            </PrivateRoute>
          }
        />
        <Route
          path="/usuario"
          element={
            <PrivateRoute allowedRoles={["Sublider"]}>
              <Index />
            </PrivateRoute>
          }
        />
        <Route path="/escrutinio" element={<PrivateRoute allowedRoles={["Escrutinio"]}><Navigate to="/escrutinio/presidenciales" replace /></PrivateRoute>} />
        <Route path="/escrutinio/presidenciales" element={<PrivateRoute allowedRoles={["Escrutinio"]}><PresidencialesApp /></PrivateRoute>} />
        <Route path="/escrutinio/concejo" element={<PrivateRoute allowedRoles={["Escrutinio"]}><ConcejoApp /></PrivateRoute>} />
        <Route path="/unauthorized" element={
          <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-400 mb-4">Acceso Denegado</h1>
              <p className="text-gray-300 mb-4">No tienes permisos para acceder a esta página.</p>
              <button
                onClick={() => window.location.href = "/"}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
              >
                Volver al inicio
              </button>
            </div>
          </div>
        } />
      </Routes>
    </>
  );
}

export default App
