import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Plus, Edit2, Trash2, User, UserPlus, UserMinus } from 'lucide-react';

const GroupManager = ({ currentUser, teachers, groups, bookings, generateTimeSlots }) => {
  const [newGroup, setNewGroup] = useState({ name: '', teacherId: '', days: [], startTime: '16:00', endTime: '18:00' });
  const [editingGroup, setEditingGroup] = useState(null);
  
  const handleAddGroup = async () => {
    if (!newGroup.name || !newGroup.teacherId || newGroup.days.length === 0) return alert("Barcha maydonlarni to'ldiring!");
    const times = generateTimeSlots(newGroup.startTime, newGroup.endTime);
    await addDoc(collection(db, "groups"), { ...newGroup, times, createdAt: new Date() });
    setNewGroup({ name: '', teacherId: '', days: [], startTime: '16:00', endTime: '18:00' });
  };

  const deleteGroup = async (id) => { if(window.confirm("Guruhni o'chirmoqchimisiz?")) await deleteDoc(doc(db, "groups", id)); };

  const addToGroup = async (studentId, groupId) => {
    await updateDoc(doc(db, "bookings", studentId), { groupId, type: 'group_member' });
  };

  const removeFromGroup = async (studentId) => {
    await updateDoc(doc(db, "bookings", studentId), { groupId: null, type: 'individual' });
  };

  const targetTeachers = currentUser.role === 'admin' ? teachers : teachers.filter(t => t.id === currentUser.id);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[40px] border-4 border-blue-50 shadow-xl">
        <h3 className="text-2xl font-black mb-6 italic tracking-tight flex items-center gap-2"><Plus className="text-blue-600"/> Yangi Guruh Tuzish</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input placeholder="Guruh nomi" className="p-4 bg-slate-50 rounded-2xl font-bold border outline-none focus:border-blue-600 transition-all" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} />
          <select className="p-4 bg-slate-50 rounded-2xl font-bold border outline-none cursor-pointer" value={newGroup.teacherId} onChange={e => setNewGroup({...newGroup, teacherId: e.target.value})}>
            <option value="">Ustozni tanlang</option>
            {targetTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div className="flex items-center justify-around gap-2 bg-slate-50 p-4 rounded-2xl border font-bold text-xs">
            {['Du', 'Se', 'Chor', 'Pay', 'Jum', 'Shan'].map(d => (
              <label key={d} className="flex items-center gap-1 cursor-pointer hover:text-blue-600">
                <input type="checkbox" checked={newGroup.days.includes(d)} onChange={e => {
                  const days = e.target.checked ? [...newGroup.days, d] : newGroup.days.filter(x => x !== d);
                  setNewGroup({...newGroup, days});
                }} className="accent-blue-600"/> {d}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-gray-400">DAN:</span>
            <input type="time" className="p-4 bg-slate-50 rounded-2xl font-bold border flex-1" value={newGroup.startTime} onChange={e => setNewGroup({...newGroup, startTime: e.target.value})} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-gray-400">GACHA:</span>
            <input type="time" className="p-4 bg-slate-50 rounded-2xl font-bold border flex-1" value={newGroup.endTime} onChange={e => setNewGroup({...newGroup, endTime: e.target.value})} />
          </div>
          <button onClick={handleAddGroup} className="bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 shadow-lg">GURUHNI SAQLASH</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.filter(g => currentUser.role === 'admin' || g.teacherId === currentUser.id).map(g => {
          const t = teachers.find(teach => teach.id === g.teacherId);
          const studentsInGroup = bookings.filter(b => b.groupId === g.id);
          const isBeingEdited = editingGroup?.id === g.id;

          return (
            <div key={g.id} className={`bg-white p-8 rounded-[40px] border-4 shadow-sm ${isBeingEdited ? 'border-blue-600' : 'border-white'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-2xl font-black text-slate-800">{g.name}</h4>
                  <p className="text-blue-600 font-bold text-xs uppercase flex items-center gap-1"><User size={12}/> {t?.name}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingGroup(isBeingEdited ? null : g)} className="p-3 bg-slate-50 text-blue-600 rounded-xl"><Edit2 size={18}/></button>
                  <button onClick={() => deleteGroup(g.id)} className="p-3 bg-slate-50 text-red-600 rounded-xl"><Trash2 size={18}/></button>
                </div>
              </div>
              {/* O'quvchilar ro'yxati va qo'shish qismi shu yerda qoladi */}
              {isBeingEdited && (
                <div className="animate-in slide-in-from-top space-y-4 border-t pt-6">
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {studentsInGroup.map(st => (
                      <div key={st.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border">
                        <p className="font-bold text-slate-700 text-sm">{st.student}</p>
                        <button onClick={() => removeFromGroup(st.id)} className="text-red-400"><UserMinus size={16}/></button>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t">
                    <p className="font-black text-[10px] text-blue-900 uppercase mb-2">Qo'shish:</p>
                    {bookings.filter(b => b.teacherId === g.teacherId && b.groupId !== g.id).map(st => (
                      <div key={st.id} className="flex justify-between items-center p-2 bg-white border rounded-lg mb-2">
                        <p className="font-bold text-xs">{st.student}</p>
                        <button onClick={() => addToGroup(st.id, g.id)} className="text-green-500"><UserPlus size={18}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GroupManager;