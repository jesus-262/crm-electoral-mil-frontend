import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { enviroments } from '../env';
import { useModal } from './ui/ModalProvider';

export default function Usuarios() {
  const navigate = useNavigate();
  const { confirmar, mostrarAviso } = useModal();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      mostrarAviso({
        titulo: 'Sesión requerida',
        mensaje: 'No estás autenticado. Inicia sesión para continuar.',
        tipo: 'error',
        icono: '🔒',
      });
      return;
    }

    try {
      const decoded = jwtDecode(storedToken);
      setRole(decoded.role);
      setToken(storedToken);

      if (decoded.role !== 'Administrador') {
        mostrarAviso({
          titulo: 'Acceso denegado',
          mensaje: 'Solo los administradores pueden ver esta sección.',
          tipo: 'error',
          icono: '⛔',
        });
        return;
      }

      const fetchUsuarios = async () => {
        try {
          const res = await axios.get(enviroments.backendUrl + '/api/admin/users', {
            headers: {
              Authorization: 'Bearer ' + storedToken,
            },
          });
          setUsuarios(res.data);
        } catch (err) {
          console.error('Error al obtener usuarios:', err);
        } finally {
          setCargando(false);
        }
      };

      fetchUsuarios();
    } catch (e) {
      mostrarAviso({
        titulo: 'Sesión inválida',
        mensaje: 'Tu token no es válido. Vuelve a iniciar sesión.',
        tipo: 'error',
        icono: '🔒',
      });
    }
  }, []);

  const eliminarUsuario = async (usuario) => {
    const ok = await confirmar({
      titulo: 'Eliminar usuario',
      mensaje:
        `Esta acción eliminará a ${usuario.nombre}` +
        `${usuario.cedula ? ` (cédula ${usuario.cedula})` : ''} y TODAS sus consultas asociadas.\n\n` +
        'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      textoCancelar: 'Cancelar',
      peligro: true,
      icono: '🗑️',
    });

    if (!ok) return;

    try {
      await axios.delete(enviroments.backendUrl + '/api/admin/users/' + usuario.id, {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      });

      setUsuarios(usuarios.filter((u) => u.id !== usuario.id));
      mostrarAviso({
        titulo: 'Usuario eliminado',
        mensaje: 'El usuario y sus consultas fueron eliminados correctamente.',
        tipo: 'exito',
      });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      mostrarAviso({
        titulo: 'Error',
        mensaje: 'No se pudo eliminar el usuario.',
        tipo: 'error',
      });
    }
  };

  const getRoleBadge = (rol) => {
    switch (rol) {
      case 'Administrador':
        return <span className='px-2 py-0.5 text-xs font-semibold bg-purple-600 text-white rounded-full'>Admin</span>;
      case 'Lider':
        return <span className='px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-full'>Líder</span>;
      case 'Sublider':
        return <span className='px-2 py-0.5 text-xs font-semibold bg-green-600 text-white rounded-full'>Sublíder</span>;
      default:
        return <span className='px-2 py-0.5 text-xs font-semibold bg-gray-600 text-white rounded-full'>{rol}</span>;
    }
  };

  if (cargando) return <p className='text-white text-center mt-10'>Cargando usuarios...</p>;

  const handleBusqueda = (e) => {
    setBusqueda(e.target.value);
    setPaginaActual(1);
  };

  const usuariosFiltrados = usuarios.filter(usuario => {
    const termino = busqueda.toLowerCase();
    if (!termino) return true;
    
    const coincideNombre = usuario.nombre.toLowerCase().includes(termino);
    const coincideCedula = usuario.cedula.toLowerCase().includes(termino);
    
    const subFiltrados = usuario.subliders?.filter(sub => {
      const subNombre = sub.nombre.toLowerCase().includes(termino);
      const subCedula = sub.cedula.toLowerCase().includes(termino);
      return subNombre || subCedula;
    });
    
    if (coincideNombre || coincideCedula) {
      return true;
    }
    if (subFiltrados && subFiltrados.length > 0) {
      usuario.sublidersFiltrados = subFiltrados;
      return true;
    }
    return false;
  });

  const totalPaginas = Math.ceil(usuariosFiltrados.length / ITEMS_POR_PAGINA);
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const usuariosPagina = usuariosFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);

  return (
    <div className='p-6 text-white max-w-4xl mx-auto'>
      <h2 className='text-2xl font-bold text-indigo-400 mb-4'>Usuarios Registrados</h2>

      <div className='mb-4'>
        <input
          type='text'
          placeholder='🔍 Buscar por nombre o cédula...'
          value={busqueda}
          onChange={handleBusqueda}
          className='w-full bg-[#1E293B] text-white border border-gray-600 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
        />
      </div>

      <div className='overflow-x-auto'>
        <table className='min-w-full text-sm border border-gray-700 bg-[#1E293B]'>
          <thead className='bg-indigo-600'>
            <tr>
              <th className='px-4 py-2 border border-gray-700'>Nombre</th>
              <th className='px-4 py-2 border border-gray-700'>Cédula</th>
              <th className='px-4 py-2 border border-gray-700'>Rol</th>
              <th className='px-4 py-2 border border-gray-700'>Total</th>
              <th className='px-4 py-2 border border-gray-700'>Subtotal</th>
              <th className='px-4 py-2 border border-gray-700'>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuariosPagina.map((usuario) => (
              <React.Fragment key={usuario.id}>
                <tr className={'hover:bg-[#334155] transition ' + (usuario.role === 'Administrador' ? 'border-l-4 border-l-purple-500' : usuario.role === 'Lider' ? 'border-l-4 border-l-blue-500' : '')}>
                  <td className='px-4 py-2 border border-gray-700'>
                    {usuario.role === 'Lider' && <span className='text-blue-400 mr-1'>👤</span>}
                    {usuario.nombre}
                  </td>
                  <td className='px-4 py-2 border border-gray-700'>{usuario.cedula || "-"}</td>
                  <td className='px-4 py-2 border border-gray-700 text-center'>{getRoleBadge(usuario.role)}</td>
                  <td className='px-4 py-2 border border-gray-700 text-center font-semibold'>{usuario.totalConsultas || 0}</td>
                  <td className='px-4 py-2 border border-gray-700 text-center font-semibold'>{usuario.subtotalConsultas || 0}</td>
                   <td className='px-4 py-2 border border-gray-700 text-center'>
                    <button
                      onClick={() => navigate('/UsuariosRegistrados/' + usuario.id)}
                      className='bg-blue-600 hover:bg-blue-500 text-white text-xs px-2.5 py-1.5 rounded mr-1'
                      title='Ver consultas'
                    >
                      📂
                    </button>
                    <button
                      onClick={() => navigate('/EditarUsuario/' + usuario.id)}
                      className='bg-amber-600 hover:bg-amber-500 text-white text-xs px-2.5 py-1.5 rounded mr-1'
                      title='Editar usuario'
                    >
                      ⚙️
                    </button>
                    {usuario.role !== 'Administrador' && (
                      <button
                        onClick={() => eliminarUsuario(usuario)}
                        className='bg-red-600 hover:bg-red-700 text-white text-xs px-2.5 py-1.5 rounded'
                        title='Eliminar usuario'
                      >
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>

                {(usuario.sublidersFiltrados || usuario.subliders)?.map((sub) => (
                  <tr key={sub.id} className='hover:bg-[#334155] transition text-sm bg-[#162032]'>
                    <td className='px-4 py-2 border border-gray-700 pl-8'>
                      <span className='text-gray-500 mr-1'>↳</span>
                      <span className='text-green-400'>{sub.nombre}</span>
                    </td>
                    <td className='px-4 py-2 border border-gray-700'>{sub.cedula || "-"}</td>
                    <td className='px-4 py-2 border border-gray-700 text-center'>{getRoleBadge(sub.role)}</td>
                    <td className='px-4 py-2 border border-gray-700 text-center font-semibold'>{sub.totalConsultas || 0}</td>
                    <td className='px-4 py-2 border border-gray-700 text-center font-semibold'>{sub.subtotalConsultas || 0}</td>
                    <td className='px-4 py-2 border border-gray-700 text-center'>
                      <button
                        onClick={() => navigate('/UsuariosRegistrados/' + sub.id)}
                        className='bg-blue-600 hover:bg-blue-500 text-white text-xs px-2.5 py-1.5 rounded mr-1'
                        title='Ver consultas'
                      >
                        📂
                      </button>
                      <button
                        onClick={() => navigate('/EditarUsuario/' + sub.id)}
                        className='bg-amber-600 hover:bg-amber-500 text-white text-xs px-2.5 py-1.5 rounded mr-1'
                        title='Editar usuario'
                      >
                        ⚙️
                      </button>
                      <button
                        onClick={() => eliminarUsuario(sub)}
                        className='bg-red-600 hover:bg-red-700 text-white text-xs px-2.5 py-1.5 rounded'
                        title='Eliminar usuario'
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}

            {usuariosFiltrados.length === 0 && (
              <tr>
                <td colSpan='6' className='text-center py-4 text-gray-400'>
                  {busqueda ? 'No se encontraron resultados para "' + busqueda + '"' : 'No hay usuarios registrados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className='flex items-center justify-between mt-4 text-sm'>
          <p className='text-slate-400'>
            Mostrando {inicio + 1}-{Math.min(inicio + ITEMS_POR_PAGINA, usuariosFiltrados.length)} de {usuariosFiltrados.length}
          </p>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className='px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition'
            >
              ← Anterior
            </button>
            <span className='text-slate-300'>
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
              className='px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition'
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
