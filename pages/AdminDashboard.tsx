import React, { useState, useEffect } from 'react';
import { School, User, UserRole, Message } from '../types';
import { API } from '../services/api';
import { ICONS } from '../constants';

interface AdminDashboardProps {
  role: UserRole;
  currentPage?: string;
}

interface ClassItem {
  id: string;
  name: string;
  level: string;
  studentCount: number;
  teacherCount: number;
  year: string;
}

interface TeacherItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  subject: string;
  classes: string[];
  schoolId: string;
}

interface StudentItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  matricule: string;
  className: string;
  schoolId: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ role, currentPage = 'dashboard' }) => {
  const isSuperAdmin = role === UserRole.SUPERADMIN;
  const [view, setView] = useState<'dashboard' | 'classes' | 'teachers' | 'students' | 'schools' | 'support'>('dashboard');
  
  // Data states
  const [schools, setSchools] = useState<School[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [tickets, setTickets] = useState<Message[]>([]);
  
  // Form states
  const [showModal, setShowModal] = useState<'class' | 'teacher' | 'student' | 'school' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    className: '',
    level: '',
    matricule: '',
    schoolId: '',
    classes: [] as string[],
  });

  useEffect(() => {
    if (currentPage === 'schools' && isSuperAdmin) setView('schools');
    else if (currentPage === 'users' || currentPage === 'teachers') setView('teachers');
    else if (currentPage === 'classes') setView('classes');
    else if (currentPage === 'students') setView('students');
    else if (currentPage === 'messaging') setView('support');
    else setView('dashboard');
  }, [currentPage, isSuperAdmin]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const [sch, usr, std, tkt] = await Promise.all([
        API.schools.list(),
        API.users.list(),
        API.students.list(),
        API.messaging.getSupportTickets()
      ]);
      setSchools(sch);
      setUsers(usr);
      
      // Process teachers from users
      const teacherUsers = usr.filter(u => u.role === UserRole.TEACHER);
      setTeachers(teacherUsers.map(t => ({
        id: t.id,
        userId: t.id,
        name: t.name,
        email: t.email,
        subject: t.subject || 'Non assigné',
        classes: t.classes || [],
        schoolId: t.schoolId || '',
      })));
      
      // Process students
      setStudents(std.map(s => ({
        id: s.id,
        userId: s.userId || '',
        name: s.name,
        email: '',
        matricule: s.matricule || '',
        className: s.className || 'Non assigné',
        schoolId: s.schoolId || '',
      })));
      
      // Generate classes from unique className values
      const classMap = new Map<string, ClassItem>();
      std.forEach((s: any) => {
        const className = s.className || 'Non assigné';
        if (!classMap.has(className)) {
          classMap.set(className, {
            id: className,
            name: className,
            level: className,
            studentCount: 0,
            teacherCount: 0,
            year: new Date().getFullYear().toString(),
          });
        }
        classMap.get(className)!.studentCount++;
      });
      
      // Count teachers per class
      teacherUsers.forEach(t => {
        (t.classes || []).forEach(cls => {
          if (classMap.has(cls)) {
            classMap.get(cls)!.teacherCount++;
          }
        });
      });
      
      setClasses(Array.from(classMap.values()));
      setTickets(tkt);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  // School CRUD
  const handleCreateSchool = async () => {
    if (!formData.name.trim()) return;
    try {
      await API.schools.create({ name: formData.name.trim() });
      setSuccess('École créée avec succès');
      closeModal();
      loadData();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création');
    }
  };

  const handleUpdateSchool = async () => {
    if (!formData.name.trim() || !editingItem) return;
    try {
      await API.schools.update({ id: editingItem.id, name: formData.name.trim() });
      setSuccess('École mise à jour');
      closeModal();
      loadData();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleDeleteSchool = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette école ?')) return;
    try {
      await API.schools.delete(id);
      setSuccess('École supprimée');
      loadData();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la suppression');
    }
  };

  // Class CRUD
  const handleCreateClass = async () => {
    if (!formData.name.trim() || !formData.level.trim()) return;
    try {
      // In a real app, this would call an API endpoint
      // For now, we'll simulate with local state
      const newClass: ClassItem = {
        id: 'cls-' + Date.now(),
        name: formData.name.trim(),
        level: formData.level.trim(),
        studentCount: 0,
        teacherCount: 0,
        year: new Date().getFullYear().toString(),
      };
      setClasses([...classes, newClass]);
      setSuccess('Classe créée avec succès');
      closeModal();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création');
    }
  };

  const handleUpdateClass = async () => {
    if (!formData.name.trim() || !editingItem) return;
    try {
      setClasses(classes.map(c => c.id === editingItem.id ? { ...c, name: formData.name.trim(), level: formData.level.trim() } : c));
      setSuccess('Classe mise à jour');
      closeModal();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette classe ?')) return;
    try {
      setClasses(classes.filter(c => c.id !== id));
      setSuccess('Classe supprimée');
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la suppression');
    }
  };

  // Teacher CRUD
  const handleCreateTeacher = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim()) return;
    try {
      const newUser = await API.users.create({
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: UserRole.TEACHER,
        schoolId: formData.schoolId || schools[0]?.id,
      });
      
      const newTeacher: TeacherItem = {
        id: newUser.id,
        userId: newUser.id,
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        classes: [],
        schoolId: newUser.schoolId || '',
      };
      setTeachers([...teachers, newTeacher]);
      setSuccess('Enseignant créé avec succès');
      closeModal();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création');
    }
  };

  const handleUpdateTeacher = async () => {
    if (!formData.name.trim() || !editingItem) return;
    try {
      const updated: TeacherItem = {
        ...editingItem,
        name: formData.name.trim(),
        subject: formData.subject.trim(),
        classes: formData.classes,
      };
      setTeachers(teachers.map(t => t.id === editingItem.id ? updated : t));
      setSuccess('Enseignant mis à jour');
      closeModal();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet enseignant ?')) return;
    try {
      await API.users.delete(id);
      setTeachers(teachers.filter(t => t.id !== id));
      setSuccess('Enseignant supprimé');
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la suppression');
    }
  };

  const assignTeacherToClass = async (teacherId: string, className: string) => {
    try {
      setTeachers(teachers.map(t => {
        if (t.id === teacherId) {
          const newClasses = t.classes.includes(className) 
            ? t.classes.filter(c => c !== className)
            : [...t.classes, className];
          return { ...t, classes: newClasses };
        }
        return t;
      }));
      setSuccess('Assignment mise à jour');
    } catch (e: any) {
      setError(e.message || 'Erreur');
    }
  };

  // Student CRUD
  const handleCreateStudent = async () => {
    if (!formData.name.trim() || !formData.matricule.trim() || !formData.className.trim()) return;
    try {
      // Create user first
      const newUser = await API.users.create({
        name: formData.name.trim(),
        email: `${formData.matricule.trim()}@edutrack.local`,
        role: UserRole.STUDENT,
        schoolId: formData.schoolId || schools[0]?.id,
      });
      
      const newStudent: StudentItem = {
        id: newUser.id,
        userId: newUser.id,
        name: formData.name.trim(),
        email: `${formData.matricule.trim()}@edutrack.local`,
        matricule: formData.matricule.trim(),
        className: formData.className.trim(),
        schoolId: newUser.schoolId || '',
      };
      setStudents([...students, newStudent]);
      
      // Update class count
      setClasses(classes.map(c => c.name === formData.className.trim() ? { ...c, studentCount: c.studentCount + 1 } : c));
      
      setSuccess('Élève créé avec succès');
      closeModal();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création');
    }
  };

  const handleUpdateStudent = async () => {
    if (!formData.name.trim() || !editingItem) return;
    try {
      const updated: StudentItem = {
        ...editingItem,
        name: formData.name.trim(),
        matricule: formData.matricule.trim(),
        className: formData.className.trim(),
      };
      setStudents(students.map(s => s.id === editingItem.id ? updated : s));
      setSuccess('Élève mis à jour');
      closeModal();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élève ?')) return;
    try {
      const student = students.find(s => s.id === id);
      await API.users.delete(id);
      setStudents(students.filter(s => s.id !== id));
      
      // Update class count
      if (student) {
        setClasses(classes.map(c => c.name === student.className ? { ...c, studentCount: Math.max(0, c.studentCount - 1) } : c));
      }
      setSuccess('Élève supprimé');
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la suppression');
    }
  };

  const openModal = (type: 'class' | 'teacher' | 'student' | 'school', item?: any) => {
    setEditingItem(item || null);
    if (item) {
      setFormData({
        name: item.name || '',
        email: item.email || '',
        subject: item.subject || '',
        className: item.className || '',
        level: item.level || '',
        matricule: item.matricule || '',
        schoolId: item.schoolId || schools[0]?.id || '',
        classes: item.classes || [],
      });
    } else {
      setFormData({
        name: '',
        email: '',
        subject: '',
        className: '',
        level: '',
        matricule: '',
        schoolId: schools[0]?.id || '',
        classes: [],
      });
    }
    setShowModal(type);
  };

  const closeModal = () => {
    setShowModal(null);
    setEditingItem(null);
    setFormData({
      name: '',
      email: '',
      subject: '',
      className: '',
      level: '',
      matricule: '',
      schoolId: schools[0]?.id || '',
      classes: [],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-bold text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          {isSuperAdmin ? '🏛️ Console Superadmin' : '⚙️ Console Administrateur'}
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          {isSuperAdmin 
            ? 'Gestion des écoles, classes, enseignants, élèves et support' 
            : 'Gestion des classes, enseignants, élèves et support de votre école'}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setView('dashboard')} 
          className={`px-4 py-2 rounded-xl font-black text-xs whitespace-nowrap ${view === 'dashboard' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          Dashboard
        </button>
        {!isSuperAdmin && (
          <button 
            onClick={() => setView('classes')} 
            className={`px-4 py-2 rounded-xl font-black text-xs whitespace-nowrap ${view === 'classes' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            Classes
          </button>
        )}
        <button 
          onClick={() => setView('teachers')} 
          className={`px-4 py-2 rounded-xl font-black text-xs whitespace-nowrap ${view === 'teachers' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          Enseignants
        </button>
        <button 
          onClick={() => setView('students')} 
          className={`px-4 py-2 rounded-xl font-black text-xs whitespace-nowrap ${view === 'students' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          Élèves
        </button>
        {isSuperAdmin && (
          <button 
            onClick={() => setView('schools')} 
            className={`px-4 py-2 rounded-xl font-black text-xs whitespace-nowrap ${view === 'schools' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            Écoles
          </button>
        )}
        <button 
          onClick={() => setView('support')} 
          className={`px-4 py-2 rounded-xl font-black text-xs whitespace-nowrap ${view === 'support' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          Support
        </button>
      </div>

      {/* Messages */}
      {error && <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm font-bold">{error}</div>}
      {success && <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm font-bold">{success}</div>}

      {/* Dashboard View */}
      {view === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <ICONS.School />
              </div>
              <p className="text-slate-400 text-xs uppercase font-black">Écoles</p>
            </div>
            <p className="text-3xl font-black text-slate-800">{schools.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <ICONS.Stats />
              </div>
              <p className="text-slate-400 text-xs uppercase font-black">Classes</p>
            </div>
            <p className="text-3xl font-black text-slate-800">{classes.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <ICONS.User />
              </div>
              <p className="text-slate-400 text-xs uppercase font-black">Enseignants</p>
            </div>
            <p className="text-3xl font-black text-slate-800">{teachers.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                <ICONS.User />
              </div>
              <p className="text-slate-400 text-xs uppercase font-black">Élèves</p>
            </div>
            <p className="text-3xl font-black text-slate-800">{students.length}</p>
          </div>
        </div>
      )}

      {/* Classes View */}
      {view === 'classes' && !isSuperAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-800">Gestion des classes</h3>
            <button 
              onClick={() => openModal('class')} 
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-indigo-700 transition-colors"
            >
              + Nouvelle classe
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map(cls => (
              <div key={cls.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-black text-slate-800 text-lg">{cls.name}</p>
                    <p className="text-xs text-slate-400">Niveau: {cls.level}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openModal('class', cls)} className="p-2 bg-amber-50 text-amber-600 rounded-lg text-xs font-black">✏️</button>
                    <button onClick={() => handleDeleteClass(cls.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-black">🗑️</button>
                  </div>
                </div>
                <div className="flex gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Élèves: </span>
                    <span className="font-black text-indigo-600">{cls.studentCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Enseignants: </span>
                    <span className="font-black text-emerald-600">{cls.teacherCount}</span>
                  </div>
                </div>
              </div>
            ))}
            {classes.length === 0 && (
              <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400">
                Aucune classe. Créez votre première classe !
              </div>
            )}
          </div>
        </div>
      )}

      {/* Teachers View */}
      {view === 'teachers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-800">Gestion des enseignants</h3>
            <button 
              onClick={() => openModal('teacher')} 
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-indigo-700 transition-colors"
            >
              + Nouvel enseignant
            </button>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-black uppercase text-slate-600">Nom</th>
                  <th className="text-left py-3 px-4 text-xs font-black uppercase text-slate-600">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-black uppercase text-slate-600">Matière</th>
                  <th className="text-left py-3 px-4 text-xs font-black uppercase text-slate-600">Classes</th>
                  <th className="text-right py-3 px-4 text-xs font-black uppercase text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher, i) => (
                  <tr key={teacher.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="py-3 px-4 font-bold text-slate-800">{teacher.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{teacher.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black">{teacher.subject}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {teacher.classes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teacher.classes.map(cls => (
                            <span key={cls} className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-xs font-bold">{cls}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">Aucune</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openModal('teacher', teacher)} className="p-2 bg-amber-50 text-amber-600 rounded-lg text-xs font-black">✏️</button>
                        <button onClick={() => handleDeleteTeacher(teacher.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-black">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {teachers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">Aucun enseignant</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Students View */}
      {view === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-800">Gestion des élèves</h3>
            <button 
              onClick={() => openModal('student')} 
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-indigo-700 transition-colors"
            >
              + Nouvel élève
            </button>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-black uppercase text-slate-600">Nom</th>
                  <th className="text-left py-3 px-4 text-xs font-black uppercase text-slate-600">Matricule</th>
                  <th className="text-left py-3 px-4 text-xs font-black uppercase text-slate-600">Classe</th>
                  <th className="text-left py-3 px-4 text-xs font-black uppercase text-slate-600">École</th>
                  <th className="text-right py-3 px-4 text-xs font-black uppercase text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, i) => (
                  <tr key={student.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="py-3 px-4 font-bold text-slate-800">{student.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 font-mono">{student.matricule}</td>
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black">{student.className}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{student.schoolId || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openModal('student', student)} className="p-2 bg-amber-50 text-amber-600 rounded-lg text-xs font-black">✏️</button>
                        <button onClick={() => handleDeleteStudent(student.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-black">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">Aucun élève</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schools View (SuperAdmin only) */}
      {view === 'schools' && isSuperAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-800">Gestion des écoles</h3>
            <button 
              onClick={() => openModal('school')} 
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-indigo-700 transition-colors"
            >
              + Nouvelle école
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schools.map(school => (
              <div key={school.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-black text-slate-800 text-lg">{school.name}</p>
                    <p className="text-xs text-slate-400">ID: {school.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openModal('school', school)} className="p-2 bg-amber-50 text-amber-600 rounded-lg text-xs font-black">✏️</button>
                    <button onClick={() => handleDeleteSchool(school.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-black">🗑️</button>
                  </div>
                </div>
                <div className="flex gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Élèves: </span>
                    <span className="font-black text-indigo-600">{students.filter(s => s.schoolId === school.id).length}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Enseignants: </span>
                    <span className="font-black text-emerald-600">{teachers.filter(t => t.schoolId === school.id).length}</span>
                  </div>
                </div>
              </div>
            ))}
            {schools.length === 0 && (
              <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400">
                Aucune école. Créez votre première école !
              </div>
            )}
          </div>
        </div>
      )}

      {/* Support View */}
      {view === 'support' && (
        <div className="space-y-4">
          <h3 className="text-xl font-black text-slate-800">Tickets de support</h3>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Aucun ticket de support</div>
            ) : (
              tickets.map((ticket, i) => (
                <div key={ticket.id} className={`p-4 border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-black text-slate-800">{ticket.senderName}</p>
                      <p className="text-sm text-slate-600 mt-1">{ticket.text}</p>
                      <p className="text-xs text-slate-400 mt-2">{ticket.timestamp}</p>
                    </div>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black">{ticket.category || 'support'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-4">
              {editingItem ? 'Modifier' : 'Créer'} {
                showModal === 'class' ? 'une classe' :
                showModal === 'teacher' ? 'un enseignant' :
                showModal === 'student' ? 'un élève' :
                'une école'
              }
            </h3>
            
            <div className="space-y-4">
              {showModal === 'class' && (
                <>
                  <input
                    type="text"
                    placeholder="Nom de la classe (ex: 6ème A)"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Niveau (ex: 6ème, 5ème, 4ème...)"
                    value={formData.level}
                    onChange={e => setFormData({...formData, level: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                  />
                </>
              )}
              
              {showModal === 'teacher' && (
                <>
                  <input
                    type="text"
                    placeholder="Nom complet"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                    disabled={!!editingItem}
                  />
                  <select
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                  >
                    <option value="">Sélectionner une matière</option>
                    <option value="Mathématiques">Mathématiques</option>
                    <option value="Français">Français</option>
                    <option value="Anglais">Anglais</option>
                    <option value="Histoire-Géo">Histoire-Géo</option>
                    <option value="Sciences">Sciences</option>
                    <option value="Physique">Physique</option>
                    <option value="SVT">SVT</option>
                    <option value="EPS">EPS</option>
                    <option value="Arts">Arts</option>
                    <option value="Musique">Musique</option>
                  </select>
                  <select
                    value={formData.schoolId}
                    onChange={e => setFormData({...formData, schoolId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                  >
                    <option value="">Sélectionner une école</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </>
              )}
              
              {showModal === 'student' && (
                <>
                  <input
                    type="text"
                    placeholder="Nom complet"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Matricule"
                    value={formData.matricule}
                    onChange={e => setFormData({...formData, matricule: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                  />
                  <select
                    value={formData.className}
                    onChange={e => setFormData({...formData, className: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                  >
                    <option value="">Sélectionner une classe</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <select
                    value={formData.schoolId}
                    onChange={e => setFormData({...formData, schoolId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                  >
                    <option value="">Sélectionner une école</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </>
              )}
              
              {showModal === 'school' && (
                <input
                  type="text"
                  placeholder="Nom de l'école"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                />
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (showModal === 'class') editingItem ? handleUpdateClass() : handleCreateClass();
                  else if (showModal === 'teacher') editingItem ? handleUpdateTeacher() : handleCreateTeacher();
                  else if (showModal === 'student') editingItem ? handleUpdateStudent() : handleCreateStudent();
                  else if (showModal === 'school') editingItem ? handleUpdateSchool() : handleCreateSchool();
                }}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-colors"
              >
                {editingItem ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;