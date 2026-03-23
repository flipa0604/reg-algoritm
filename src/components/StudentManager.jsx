import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Plus, CheckCircle, Trash2, Search, Edit2, XCircle, Lock, Phone, UserPlus, Save } from 'lucide-react';

const StudentManager = ({ filterId, bookings, teachers, markAttendance, hideAttendanceBtn }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  
  const [manual, setManual] = useState({ 
    name: '', phone: '', teacherId: filterId || '', password: '', topic: 'Speaking' 
  });

  const filteredList = bookings
    .filter(b => (filterId ? b.teacherId === filterId : true))
    .filter(b => 
      b.student.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.phone.includes(searchTerm)
    );

  const handleManualAdd = async () => {
    if (!manual.name || !manual.phone || !manual.teacherId || !manual.password) {
      return alert("Barcha maydonlarni to'ldiring!");
    }
    try {
      await addDoc(collection(db, "bookings"), { 
        student: manual.name, phone: manual.phone, teacherId: manual.teacherId,
        password: manual.password, topic: manual.topic, attended: null, 
        createdAt: new Date(), type: 'manual', groupId: null 
      });
      alert("O'quvchi qo'shildi!");
      setManual({ name: '', phone: '', teacherId: filterId || '', password: '', topic: 'Speaking' });
      setShowAddForm(false);
    } catch { alert("Xatolik!"); }
  };

  const handleUpdateStudent = async () => {
    const studentRef = doc(db, "bookings", editingStudent.id);
    await updateDoc(studentRef, {
      student: editingStudent.student,
      phone: editingStudent.phone,
      teacherId: editingStudent.teacherId,
      password: editingStudent.password,
      topic: editingStudent.topic
    });
    setEditingStudent(null);
    alert("Ma'lumotlar yangilandi!");
  };

  const deleteStudent = async (id) => { if (window.confirm("O'chirilsinmi?")) await deleteDoc(doc(db, "bookings", id)); };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="O'quvchilardan qidirish..." 
            className="w-full p-3.5 pl-12 bg-white rounded-2xl border-2 border-slate-100 shadow-sm outline-none focus:border-blue-500 font-[1000] text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)} 
          className="w-full md:w-auto bg-green-500 text-white px-8 py-3.5 rounded-2xl font-[1000] flex items-center justify-center gap-2 hover:bg-green-600 shadow-lg transition-all uppercase tracking-widest"
        >
          {showAddForm ? <XCircle size={20}/> : <UserPlus size={20}/>} 
          {showAddForm ? "YOPISH" : "YANGI O'QUVCHI"}
        </button>
      </div>

      {showAddForm && (
        <div className="p-8 bg-slate-900/80 backdrop-blur-xl rounded-[40px] border-4 border-green-500/30 shadow-2xl animate-in slide-in-from-top">
          <h3 className="text-2xl font-[1000] mb-8 text-white flex items-center gap-2 uppercase italic tracking-tighter"><Plus className="text-green-500"/> Ro'yxatga qo'shish</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-blue-400 ml-2 uppercase tracking-widest">F.I.SH</label>
              <input className="w-full p-4 rounded-2xl bg-white font-[1000] text-slate-900 outline-none focus:ring-4 ring-green-500/20" placeholder="Ism Familiya" value={manual.name} onChange={e => setManual({...manual, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-blue-400 ml-2 uppercase tracking-widest">Telefon</label>
              <input className="w-full p-4 rounded-2xl bg-white font-[1000] text-slate-900 outline-none focus:ring-4 ring-green-500/20" placeholder="901234567" value={manual.phone} onChange={e => setManual({...manual, phone: e.target.value})} maxLength="9" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-blue-400 ml-2 uppercase tracking-widest">Ustoz</label>
              <select className="w-full p-4 rounded-2xl bg-white font-[1000] text-slate-900 outline-none focus:ring-4 ring-green-500/20" value={manual.teacherId} onChange={e => setManual({...manual, teacherId: e.target.value})}>
                <option value="">Ustozni tanlang</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-blue-400 ml-2 uppercase tracking-widest">Parol</label>
              <input className="w-full p-4 rounded-2xl bg-white font-[1000] text-slate-900 outline-none focus:ring-4 ring-green-500/20" placeholder="Parol kiriting" value={manual.password} onChange={e => setManual({...manual, password: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-blue-400 ml-2 uppercase tracking-widest">Mavzu</label>
              <select className="w-full p-4 rounded-2xl bg-white font-[1000] text-slate-900 outline-none focus:ring-4 ring-green-500/20" value={manual.topic} onChange={e => setManual({...manual, topic: e.target.value})}>
                {['Speaking', 'Listening', 'Writing', 'Reading', 'Grammar', 'IELTS'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleManualAdd} className="w-full bg-green-500 text-white py-5 rounded-2xl font-[1000] text-xl hover:bg-green-600 transition-all uppercase shadow-xl shadow-green-500/20 tracking-tighter">O'QUVCHINI SAQLASH</button>
        </div>
      )}

      {/* TAHRIRLASH MODALI */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[150] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl border-t-[12px] border-blue-600 overflow-hidden text-slate-900 animate-in zoom-in duration-300">
            <div className="p-10 md:p-14">
              <div className="flex justify-between items-center mb-8 text-slate-900">
                <h3 className="text-4xl font-[1000] italic tracking-tighter uppercase">Tahrirlash</h3>
                <button onClick={() => setEditingStudent(null)} className="p-3 bg-slate-100 text-slate-400 hover:text-red-500 rounded-2xl transition-all hover:rotate-90"><XCircle size={24}/></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">F.I.SH</label>
                  <input className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-600 outline-none font-[1000] text-slate-900 transition-all" value={editingStudent.student} onChange={e => setEditingStudent({...editingStudent, student: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Telefon</label>
                  <input className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-600 outline-none font-[1000] text-slate-900 transition-all" value={editingStudent.phone} onChange={e => setEditingStudent({...editingStudent, phone: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Ustoz</label>
                  <select className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-600 outline-none font-[1000] text-slate-900 transition-all" value={editingStudent.teacherId} onChange={e => setEditingStudent({...editingStudent, teacherId: e.target.value})}>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Parol</label>
                  <input className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-600 outline-none font-[1000] text-slate-900 transition-all" value={editingStudent.password || ''} onChange={e => setEditingStudent({...editingStudent, password: e.target.value})} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Dars Mavzusi</label>
                  <input className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-600 outline-none font-[1000] text-slate-900 transition-all" value={editingStudent.topic || ''} onChange={e => setEditingStudent({...editingStudent, topic: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={handleUpdateStudent} className="flex-1 bg-blue-600 text-white py-5 rounded-[24px] font-[1000] text-lg shadow-xl hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-tighter flex items-center justify-center gap-2"><Save size={20}/> Saqlash</button>
                <button onClick={() => setEditingStudent(null)} className="px-8 bg-slate-100 text-slate-500 py-5 rounded-[24px] font-[1000] hover:bg-slate-200 transition-all uppercase text-xs">Bekor qilish</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RO'YXAT JADVALI */}
      <div className="bg-slate-900/60 rounded-[40px] shadow-2xl border border-white/10 overflow-hidden overflow-x-auto backdrop-blur-md">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="p-6 font-[1000] uppercase text-xs text-blue-400 tracking-[0.2em]">O'quvchi</th>
              <th className="p-6 font-[1000] uppercase text-xs text-blue-400 tracking-[0.2em]">Aloqa / Parol</th>
              <th className="p-6 font-[1000] uppercase text-xs text-blue-400 tracking-[0.2em] text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredList.map(b => (
              <tr key={b.id} className="hover:bg-white/5 transition-all group">
                <td className="p-6">
                  <p className="font-[1000] text-white text-xl uppercase tracking-tighter">{b.student}</p>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest opacity-80">{b.topic || 'Dars'}</p>
                </td>
                <td className="p-6">
                  <div className="flex flex-col space-y-1">
                    <span className="font-[1000] text-slate-200 text-sm flex items-center gap-2"><Phone size={14} className="text-blue-500"/> +998 {b.phone}</span>
                    <span className="font-black text-yellow-500 text-xs flex items-center gap-2 uppercase tracking-widest"><Lock size={12}/> {b.password || '---'}</span>
                  </div>
                </td>
                <td className="p-6 text-right">
                  <div className="flex justify-end gap-3">
                    {!hideAttendanceBtn && (
                      <button onClick={() => markAttendance(b.id, !b.attended)} className={`p-4 rounded-2xl transition-all shadow-lg ${b.attended ? 'bg-green-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}><CheckCircle size={20}/></button>
                    )}
                    <button onClick={() => setEditingStudent(b)} className="p-4 bg-white/5 text-blue-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-lg border border-white/5"><Edit2 size={20}/></button>
                    <button onClick={() => deleteStudent(b.id)} className="p-4 bg-white/5 text-red-400 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-lg border border-white/5"><Trash2 size={20}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentManager;