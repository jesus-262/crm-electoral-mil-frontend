import { jwtDecode } from "jwt-decode";
import Usuarios from '../Usuarios';

function Admin() {
  const token = localStorage.getItem("token");
  if (token) {
    const decoded = jwtDecode(token);
    console.log("ID:", decoded.id);
    console.log("Email:", decoded.email);
    console.log("Rol:", decoded.role);
    console.log("Nombre:", decoded.nombre);
  }

  return (
    <>
      <Usuarios />
    </>
  );
}

export default Admin;
