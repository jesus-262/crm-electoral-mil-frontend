import { jwtDecode } from "jwt-decode";
import Consulta from '../Consuta';

function Index() {
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
      <Consulta />
    </>
  );
}

export default Index;
