import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot } from "firebase/firestore";
import { BarChart3, User, Edit2, Trash2, Plus, Key, Clock, Phone, MessageCircle, XCircle, Save, Info, Calendar, Search, ShieldCheck, Star } from 'lucide-react';
import StudentManager from '../components/StudentManager';

const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

const AdminPanel = ({ teachers, bookings, bannedUsers }) => {
  const [adminTab, setAdminTab] = useState('analytics');
  
  // Statistika bo'limi uchun yangi holatlar (State)
  const [statsPeriod, setStatsPeriod] = useState('monthly'); // Asosiy oylik qilib qo'yildi
  const [statSelectedMonth, setStatSelectedMonth] = useState(new Date().getMonth().toString());
  const [statSelectedYear, setStatSelectedYear] = useState(new Date().getFullYear().toString());
  const [statSelectedDate, setStatSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [selectedTeacherStats, setSelectedTeacherStats] = useState(null);
  const [comments, setComments] = useState([]);
  const [newTeacher, setNewTeacher] = useState({ name: '', subject: '', phone: '', password: '', startTime: '08:00', endTime: '20:00' });
  const [editingTeacher, setEditingTeacher] = useState(null);

  // Control bo'limi: davomat vs baholashlar
  const [controlPeriod, setControlPeriod] = useState('monthly'); // daily | monthly | yearly
  const [controlDate, setControlDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [controlMonth, setControlMonth] = useState(new Date().getMonth().toString());
  const [controlYear, setControlYear] = useState(new Date().getFullYear().toString());
  const [controlYearOnly, setControlYearOnly] = useState(new Date().getFullYear().toString());
  const [selectedControlTeacher, setSelectedControlTeacher] = useState(null); // ustoz bosilganda talabalar ro'yxati
  const [viewingComment, setViewingComment] = useState(null); // izoh o'qish modali: { studentName, text }

  // Oylik hisobot (Aloohida bo'lim) uchun state'lar
  const [reportMonth, setReportMonth] = useState(new Date().getMonth().toString());
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [reportSearch, setReportSearch] = useState('');

  useEffect(() => {
    onSnapshot(collection(db, "comments"), (s) => setComments(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  // Firebase sanalarini to'g'ri o'qish uchun yordamchi funksiya
  const parseDate = (createdAt) => {
    if (!createdAt) return new Date();
    if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
    if (typeof createdAt.toDate === 'function') return createdAt.toDate();
    return new Date(createdAt);
  };

  // "15-Mart" + yil -> Date (Control bo'limi uchun)
  const parseBookingDateWithYear = (dateStr, year) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    const day = parseInt(parts[0], 10);
    const monthName = parts[1];
    const monthIndex = monthNames.indexOf(monthName);
    if (monthIndex === -1 || isNaN(day)) return null;
    return new Date(parseInt(year, 10), monthIndex, day);
  };

  const getRatedAtDate = (b) => {
    if (!b.ratedAt) return null;
    return parseDate(b.ratedAt);
  };

  // Control: tanlangan davrga mos bookinglarni filtrlash (dars sanasi bo'yicha)
  const controlBookingsInPeriod = (teacherId) => {
    const year = controlPeriod === 'yearly' ? parseInt(controlYearOnly, 10) : parseInt(controlYear, 10);
    return bookings.filter(b => {
      if (b.teacherId !== teacherId) return false;
      const lessonDate = parseBookingDateWithYear(b.date, year);
      if (!lessonDate) return false;
      if (controlPeriod === 'daily') {
        const [y, m, d] = controlDate.split('-').map(Number);
        return lessonDate.getFullYear() === y && lessonDate.getMonth() === m - 1 && lessonDate.getDate() === d;
      }
      if (controlPeriod === 'monthly') {
        return lessonDate.getMonth() === parseInt(controlMonth) && lessonDate.getFullYear() === year;
      }
      return lessonDate.getFullYear() === year;
    });
  };

  // Control: shu davrda baholangan bookinglar (ratedAt bo'yicha)
  const controlRatingsInPeriod = (teacherId) => {
    return bookings.filter(b => {
      if (b.teacherId !== teacherId || b.rating == null) return false;
      const rt = getRatedAtDate(b);
      if (!rt) return false;
      const year = controlPeriod === 'yearly' ? parseInt(controlYearOnly, 10) : parseInt(controlYear, 10);
      if (controlPeriod === 'daily') {
        const [y, m, d] = controlDate.split('-').map(Number);
        return rt.getFullYear() === y && rt.getMonth() === m - 1 && rt.getDate() === d;
      }
      if (controlPeriod === 'monthly') {
        return rt.getMonth() === parseInt(controlMonth) && rt.getFullYear() === year;
      }
      return rt.getFullYear() === year;
    });
  };

  // FILTRLASH LOGIKASI (Yangi qo'shilgan sanani tanlash bo'yicha)
  const getFilteredBookings = (teacherId) => {
    return bookings.filter(b => {
      if (b.teacherId !== teacherId) return false;
      const bDate = parseDate(b.createdAt);
      
      if (statsPeriod === 'daily') {
        const localYMD = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}-${String(bDate.getDate()).padStart(2, '0')}`;
        return localYMD === statSelectedDate;
      }
      
      if (statsPeriod === 'monthly') {
        return bDate.getMonth() === parseInt(statSelectedMonth) && bDate.getFullYear() === parseInt(statSelectedYear);
      }
      
      return true;
    });
  };

  // OYLIK HISOBOT LOGIKASI (Faqat kelgan darslarni hisoblash)
  const getReportData = () => {
    let validBookings = bookings.filter(b => b.attended === true);

    validBookings = validBookings.filter(b => {
      const d = parseDate(b.createdAt);
      return d.getMonth() === parseInt(reportMonth) && d.getFullYear() === parseInt(reportYear);
    });

    const statsMap = {};
    validBookings.forEach(b => {
      const t = teachers.find(t => t.id === b.teacherId);
      const teacherName = t ? t.name : "Noma'lum Ustoz";
      const key = `${b.teacherId}_${b.phone}`; 
      
      if (!statsMap[key]) {
        statsMap[key] = { teacherName, studentName: b.student, phone: b.phone, count: 0 };
      }
      statsMap[key].count += 1;
    });

    let reportArr = Object.values(statsMap);

    if (reportSearch) {
      const lowerTerm = reportSearch.toLowerCase();
      reportArr = reportArr.filter(item => 
        item.studentName.toLowerCase().includes(lowerTerm) || 
        item.phone.includes(lowerTerm)
      );
    }

    return reportArr.sort((a, b) => b.count - a.count);
  };

  const reportData = getReportData();

  const handleAddTeacher = async () => {
    if (!newTeacher.name || !newTeacher.subject || !newTeacher.phone || !newTeacher.password) return alert("Barcha maydonlarni to'ldiring!");
    await addDoc(collection(db, "teachers"), newTeacher);
    setNewTeacher({ name: '', subject: '', phone: '', password: '', startTime: '08:00', endTime: '20:00' });
    alert("Ustoz muvaffaqiyatli qo'shildi!");
  };

  const handleUpdateTeacher = async () => {
    if (!editingTeacher.name || !editingTeacher.subject || !editingTeacher.phone) return alert("Ma'lumotlarni to'liq kiriting!");
    const teacherRef = doc(db, "teachers", editingTeacher.id);
    await updateDoc(teacherRef, editingTeacher);
    setEditingTeacher(null);
    alert("Ma'lumotlar yangilandi!");
  };

  const deleteTeacher = async (id) => {
    if(window.confirm("Ustozni o'chirib tashlamoqchimisiz?")) await deleteDoc(doc(db, "teachers", id));
  };

  // BANNED YECHISH FUNKSIYASI
  const handleUnban = async (id) => {
    if (window.confirm("Rostdan ham ushbu o'quvchini bandan yechmoqchimisiz?")) {
      await deleteDoc(doc(db, "banned_users", id));
      alert("O'quvchi muvaffaqiyatli blokdan chiqarildi!");
    }
  };

  return (
    <div className="animate-in fade-in space-y-8 md:space-y-10">
      {/* TABS MENU */}
      <div className="flex bg-slate-800/50 p-2 rounded-2xl gap-2 mb-6 md:mb-8 w-full md:w-fit mx-auto border border-white/10 backdrop-blur-md shadow-2xl overflow-x-auto scrollbar-hide">
        {['analytics', 'control', 'students', 'monthly_report', 'manage', 'comments', 'banned'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setAdminTab(tab)} 
            className={`px-4 md:px-8 py-2 md:py-2.5 whitespace-nowrap rounded-xl font-[1000] text-[10px] md:text-xs uppercase transition-all tracking-widest ${adminTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            {tab === 'analytics' ? 'Statistika' : 
             tab === 'control' ? 'Control' : 
             tab === 'students' ? 'O\'quvchilar' : 
             tab === 'monthly_report' ? 'Oylik Hisobot' : 
             tab === 'manage' ? 'Ustozlar' : 
             tab === 'banned' ? 'Ban qilinganlar' : 'Fikrlar'}
          </button>
        ))}
      </div>

      {/* 1. STATISTIKA SECTION */}
      {adminTab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-2xl md:text-4xl font-[1000] text-white uppercase italic flex items-center gap-3 drop-shadow-xl">
              <BarChart3 className="text-blue-500 shrink-0" size={32}/> Faoliyat Tahlili
            </h2>
            <div className="flex bg-slate-900/80 rounded-2xl p-1.5 border border-white/10 w-full md:w-auto">
              {['monthly', 'daily'].map(p => (
                <button key={p} onClick={() => setStatsPeriod(p)} className={`flex-1 md:flex-none px-4 md:px-8 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${statsPeriod === p ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                  {p === 'monthly' ? 'Oylik' : 'Kunlik'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {statsPeriod === 'monthly' ? (
              <>
                <select 
                  className="p-3 md:p-4 bg-slate-900/80 text-white rounded-xl md:rounded-2xl border-2 border-white/10 outline-none focus:border-blue-500 transition-all font-black text-xs md:text-sm uppercase tracking-widest cursor-pointer shadow-inner flex-1 md:flex-none md:w-48"
                  value={statSelectedMonth}
                  onChange={e => setStatSelectedMonth(e.target.value)}
                >
                  {['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'].map((m, i) => (
                    <option key={i} value={i} className="bg-slate-800">{m}</option>
                  ))}
                </select>
                <select 
                  className="p-3 md:p-4 bg-slate-900/80 text-white rounded-xl md:rounded-2xl border-2 border-white/10 outline-none focus:border-blue-500 transition-all font-black text-xs md:text-sm uppercase tracking-widest cursor-pointer shadow-inner flex-1 md:flex-none md:w-32"
                  value={statSelectedYear}
                  onChange={e => setStatSelectedYear(e.target.value)}
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y} className="bg-slate-800">{y}</option>
                  ))}
                </select>
              </>
            ) : (
              <input 
                type="date" 
                className="p-3 md:p-4 bg-slate-900/80 text-white rounded-xl md:rounded-2xl border-2 border-white/10 outline-none focus:border-blue-500 transition-all font-black text-xs md:text-sm uppercase tracking-widest cursor-pointer shadow-inner w-full md:w-auto"
                value={statSelectedDate}
                onChange={e => setStatSelectedDate(e.target.value)}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {teachers.map(t => {
              const filtered = getFilteredBookings(t.id);
              const attended = filtered.filter(b => b.attended === true).length;
              const missing = filtered.filter(b => b.attended === false).length;

              return (
                <div key={t.id} className="bg-slate-900/60 p-6 md:p-8 rounded-3xl md:rounded-[40px] border border-white/10 shadow-2xl backdrop-blur-sm group hover:border-blue-50/50 transition-all">
                  <h3 className="text-xl md:text-2xl font-[1000] text-white uppercase mb-4 md:mb-6 tracking-tighter">{t.name}</h3>
                  <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8 text-white font-[1000]">
                    <div className="bg-green-500/10 p-3 md:p-4 rounded-[20px] md:rounded-3xl border border-green-500/20 text-center">
                      <p className="text-[9px] md:text-[10px] text-green-400 uppercase mb-1">Kelgan</p>
                      <p className="text-3xl md:text-4xl">{attended}</p>
                    </div>
                    <div className="bg-red-500/10 p-3 md:p-4 rounded-[20px] md:rounded-3xl border border-red-500/20 text-center">
                      <p className="text-[9px] md:text-[10px] text-red-400 uppercase mb-1">Kelmagan</p>
                      <p className="text-3xl md:text-4xl">{missing}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedTeacherStats({ teacher: t, list: filtered })} className="w-full py-3 md:py-4 bg-white/5 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl md:rounded-2xl font-[1000] text-[10px] md:text-xs uppercase flex items-center justify-center gap-2 transition-all border border-white/5">
                    <Info size={16}/> Batafsil ma'lumot
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STATISTIKA MODAL */}
      {selectedTeacherStats && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl md:rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-5 md:p-8 border-b bg-slate-50 flex justify-between items-center text-slate-900">
              <div>
                <h3 className="text-xl md:text-3xl font-[1000] uppercase italic tracking-tighter">{selectedTeacherStats.teacher.name}</h3>
                <p className="text-blue-600 font-black text-[10px] md:text-xs uppercase mt-1 tracking-widest">Batafsil Hisobot</p>
              </div>
              <button onClick={() => setSelectedTeacherStats(null)} className="p-2 md:p-3 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all"><XCircle size={28}/></button>
            </div>
            <div className="p-0 md:p-8 max-h-[60vh] overflow-y-auto">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left min-w-[500px]">
                  <thead>
                    <tr className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase border-b tracking-[0.2em]">
                      <th className="p-4 md:pb-6">O'quvchi</th>
                      <th className="p-4 md:pb-6">Telefon</th>
                      <th className="p-4 md:pb-6">Sana</th>
                      <th className="p-4 md:pb-6 text-right">Holat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-900 font-black">
                    {selectedTeacherStats.list.map(b => (
                      <tr key={b.id}>
                        <td className="p-4 md:py-5 text-sm md:text-lg uppercase">{b.student}</td>
                        <td className="p-4 md:py-5 opacity-70 text-xs md:text-base"><Phone size={14} className="inline mr-1 md:mr-2"/> {b.phone}</td>
                        <td className="p-4 md:py-5 opacity-70 text-xs md:text-base"><Calendar size={14} className="inline mr-1 md:mr-2"/> {b.date}</td>
                        <td className="p-4 md:py-5 text-right">
                          <span className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[8px] md:text-[10px] ${b.attended ? 'bg-green-100 text-green-600' : b.attended === false ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                            {b.attended ? 'KELDI' : b.attended === false ? 'KELMADI' : 'KUTILMOQDA'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTROL: davomat vs baholashlar */}
      {adminTab === 'control' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-2xl md:text-4xl font-[1000] text-white uppercase italic flex items-center gap-3 drop-shadow-xl">
              <ShieldCheck className="text-amber-500 shrink-0" size={32}/> Control
            </h2>
            <div className="flex bg-slate-900/80 rounded-2xl p-1.5 border border-white/10 w-full md:w-auto">
              {['daily', 'monthly', 'yearly'].map(p => (
                <button key={p} onClick={() => setControlPeriod(p)} className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${controlPeriod === p ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                  {p === 'daily' ? 'Kunlik' : p === 'monthly' ? 'Oylik' : 'Yillik'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {controlPeriod === 'daily' && (
              <input type="date" className="p-3 md:p-4 bg-slate-900/80 text-white rounded-xl border-2 border-white/10 outline-none focus:border-amber-500 font-black text-xs uppercase tracking-widest" value={controlDate} onChange={e => setControlDate(e.target.value)} />
            )}
            {controlPeriod === 'monthly' && (
              <>
                <select className="p-3 md:p-4 bg-slate-900/80 text-white rounded-xl border-2 border-white/10 outline-none focus:border-amber-500 font-black text-xs uppercase tracking-widest cursor-pointer" value={controlMonth} onChange={e => setControlMonth(e.target.value)}>
                  {monthNames.map((m, i) => <option key={i} value={i} className="bg-slate-800">{m}</option>)}
                </select>
                <select className="p-3 md:p-4 bg-slate-900/80 text-white rounded-xl border-2 border-white/10 outline-none focus:border-amber-500 font-black text-xs uppercase tracking-widest cursor-pointer" value={controlYear} onChange={e => setControlYear(e.target.value)}>
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y} className="bg-slate-800">{y}</option>)}
                </select>
              </>
            )}
            {controlPeriod === 'yearly' && (
              <select className="p-3 md:p-4 bg-slate-900/80 text-white rounded-xl border-2 border-white/10 outline-none focus:border-amber-500 font-black text-xs uppercase tracking-widest cursor-pointer" value={controlYearOnly} onChange={e => setControlYearOnly(e.target.value)}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y} className="bg-slate-800">{y}</option>)}
              </select>
            )}
          </div>

          {/* Taqqoslash: Ustoz davomati vs Baholashlar soni */}
          <div className="bg-slate-900/60 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <h3 className="p-4 md:p-6 text-amber-400 font-black uppercase text-xs tracking-widest border-b border-white/10">Ustoz davomati vs O'quvchi baholashlari</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr className="text-slate-300 font-black uppercase text-[9px] md:text-[10px] tracking-widest">
                    <th className="p-4 md:p-6">Ustoz</th>
                    <th className="p-4 md:p-6 text-center">Davomat (ustoz belgilagan)</th>
                    <th className="p-4 md:p-6 text-center">Baholashlar soni</th>
                    <th className="p-4 md:p-6 text-center">O'rtacha ball</th>
                    <th className="p-4 md:p-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white font-bold">
                  {teachers.map(t => {
                    const inPeriod = controlBookingsInPeriod(t.id);
                    const attendedCount = inPeriod.filter(b => b.attended === true).length;
                    const rated = controlRatingsInPeriod(t.id);
                    const ratingCount = rated.length;
                    const avgRating = ratingCount > 0 ? (rated.reduce((s, b) => s + (b.rating || 0), 0) / ratingCount).toFixed(1) : '—';
                    return (
                      <tr key={t.id} className="hover:bg-white/5 transition-all">
                        <td className="p-4 md:p-6 font-[1000] uppercase tracking-tighter">{t.name}</td>
                        <td className="p-4 md:p-6 text-center text-green-400">{attendedCount}</td>
                        <td className="p-4 md:p-6 text-center text-amber-400">{ratingCount}</td>
                        <td className="p-4 md:p-6 text-center"><span className="inline-flex items-center gap-1"><Star size={14} className="text-amber-400"/>{avgRating}</span></td>
                        <td className="p-4 md:p-6">
                          <button onClick={() => setSelectedControlTeacher({ teacher: t, ratings: rated })} className="px-3 py-2 bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all">Batafsil</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ustoz bosilganda: talabalar ball, sana/soat, izoh o'qish */}
          {selectedControlTeacher && (
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                <div className="p-5 md:p-8 border-b bg-slate-50 flex justify-between items-center">
                  <h3 className="text-xl md:text-2xl font-[1000] uppercase italic text-slate-900">{selectedControlTeacher.teacher.name} — Talabalar baholashlari</h3>
                  <button onClick={() => setSelectedControlTeacher(null)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl"><XCircle size={28}/></button>
                </div>
                <div className="p-4 md:p-6 max-h-[60vh] overflow-y-auto">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase border-b tracking-widest">
                          <th className="p-3 md:p-4">Talaba</th>
                          <th className="p-3 md:p-4">Guruhi</th>
                          <th className="p-3 md:p-4">Raqam</th>
                          <th className="p-3 md:p-4 text-center">Ball</th>
                          <th className="p-3 md:p-4">Baholangan sana va soat</th>
                          <th className="p-3 md:p-4">Izoh</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800 font-bold">
                        {selectedControlTeacher.ratings.map(b => {
                          const ratedAtDate = getRatedAtDate(b);
                          const sanaSoat = ratedAtDate ? ratedAtDate.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
                          const hasComment = b.ratingComment && b.ratingComment.trim();
                          return (
                            <tr key={b.id}>
                              <td className="p-3 md:p-4 uppercase">{b.student}</td>
                              <td className="p-3 md:p-4 text-slate-600">{b.originGroup || '—'}</td>
                              <td className="p-3 md:p-4 text-slate-500 tracking-widest text-sm">+998 {b.phone}</td>
                              <td className="p-3 md:p-4 text-center"><span className="inline-flex items-center gap-1 text-amber-600 font-black"><Star size={14}/>{b.rating}/5</span></td>
                              <td className="p-3 md:p-4 text-slate-600 text-xs whitespace-nowrap">{sanaSoat}</td>
                              <td className="p-3 md:p-4">
                                {hasComment ? (
                                  <button type="button" onClick={() => setViewingComment({ studentName: b.student, text: b.ratingComment })} className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all">O'qish</button>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {selectedControlTeacher.ratings.length === 0 && (
                          <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-black uppercase text-xs">Baholashlar yo'q</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Izoh o'qish modali */}
          {viewingComment && (
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[310] flex items-center justify-center p-4" onClick={() => setViewingComment(null)}>
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{viewingComment.studentName} — izohi</p>
                <p className="text-slate-800 font-bold text-base leading-relaxed whitespace-pre-wrap">{viewingComment.text}</p>
                <button onClick={() => setViewingComment(null)} className="mt-6 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-sm uppercase transition-all">Yopish</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. STUDENTS SECTION */}
      {adminTab === 'students' && (
        <div className="space-y-6">
          <h2 className="text-2xl md:text-4xl font-[1000] text-white uppercase italic flex items-center gap-3 drop-shadow-xl">
            <User className="text-blue-500 shrink-0" size={32}/> O'quvchilar
          </h2>
          <div className="overflow-x-auto">
             <StudentManager bookings={bookings} teachers={teachers} markAttendance={null} hideAttendanceBtn={true} />
          </div>
        </div>
      )}

      {/* 3. OYLIK HISOBOT SECTION */}
      {adminTab === 'monthly_report' && (
        <div className="space-y-6 animate-in zoom-in">
          <h2 className="text-2xl md:text-4xl font-[1000] text-white uppercase italic flex items-center gap-3 drop-shadow-xl mb-4 md:mb-8">
            <Calendar className="text-blue-500 shrink-0" size={32}/> Oylik Hisobot
          </h2>

          <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-[18px] md:top-5 text-slate-400" size={18}/>
              <input 
                type="text" 
                placeholder="Ism yoki nomer bo'yicha..." 
                className="w-full p-4 md:p-5 pl-12 md:pl-14 bg-slate-900/80 text-white rounded-[20px] md:rounded-[24px] border-2 border-white/10 outline-none focus:border-blue-500 transition-all font-black text-xs md:text-sm uppercase tracking-widest shadow-inner"
                value={reportSearch}
                onChange={e => setReportSearch(e.target.value)}
              />
            </div>
            <select 
              className="p-4 md:p-5 bg-slate-900/80 text-white rounded-[20px] md:rounded-[24px] border-2 border-white/10 outline-none focus:border-blue-500 transition-all font-black w-full md:w-56 text-xs md:text-sm uppercase tracking-widest cursor-pointer shadow-inner"
              value={reportMonth}
              onChange={e => setReportMonth(e.target.value)}
            >
              {['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'].map((m, i) => (
                <option key={i} value={i} className="bg-slate-800">{m}</option>
              ))}
            </select>
            <select 
              className="p-4 md:p-5 bg-slate-900/80 text-white rounded-[20px] md:rounded-[24px] border-2 border-white/10 outline-none focus:border-blue-500 transition-all font-black w-full md:w-32 text-xs md:text-sm uppercase tracking-widest cursor-pointer shadow-inner"
              value={reportYear}
              onChange={e => setReportYear(e.target.value)}
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y} className="bg-slate-800">{y}</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-900/60 rounded-3xl md:rounded-[40px] border border-white/10 overflow-hidden shadow-2xl backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr className="text-blue-400 font-black uppercase text-[9px] md:text-[10px] tracking-[0.3em]">
                    <th className="p-5 md:p-8">Ustoz</th>
                    <th className="p-5 md:p-8">O'quvchi</th>
                    <th className="p-5 md:p-8">Nomer</th>
                    <th className="p-5 md:p-8 text-center">Jami (Kelgan)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white font-bold">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-all group">
                      <td className="p-5 md:p-8 text-sm md:text-xl font-[1000] uppercase tracking-tighter text-blue-100">{row.teacherName}</td>
                      <td className="p-5 md:p-8 text-sm md:text-xl font-[1000] uppercase tracking-tighter">{row.studentName}</td>
                      <td className="p-5 md:p-8 text-slate-400 tracking-widest text-xs md:text-sm">{row.phone}</td>
                      <td className="p-5 md:p-8 text-center">
                        <span className="inline-block bg-green-500/10 text-green-400 px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl text-lg md:text-2xl font-[1000] border border-green-500/20 shadow-lg">
                          {row.count} marta
                        </span>
                      </td>
                    </tr>
                  ))}
                  {reportData.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-12 md:p-20 text-center text-slate-500 font-black uppercase text-xs md:text-sm tracking-[0.3em]">
                        Ma'lumot topilmadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. COMMENTS SECTION */}
      {adminTab === 'comments' && (
        <div className="space-y-6 text-white font-black">
          <h2 className="text-2xl md:text-4xl font-[1000] italic tracking-tighter flex items-center gap-3 drop-shadow-xl uppercase">
            <MessageCircle size={32} className="text-blue-500 shrink-0"/> Fikrlar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {comments.map(c => (
              <div key={c.id} className="bg-slate-900/60 p-6 md:p-8 rounded-3xl md:rounded-[40px] border border-white/10 backdrop-blur-xl shadow-xl">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-blue-400 uppercase text-xs tracking-widest">{c.studentName}</p>
                  <span className="text-[9px] md:text-[10px] text-slate-500 uppercase tracking-widest">+998 {c.studentPhone}</span>
                </div>
                <p className="italic text-base md:text-lg leading-relaxed text-slate-200">"{c.text}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. BANNED USERS SECTION (YANGI QO'SHILDI) */}
      {adminTab === 'banned' && (
        <div className="space-y-6 animate-in zoom-in">
          <h2 className="text-2xl md:text-4xl font-[1000] text-white uppercase italic flex items-center gap-3 drop-shadow-xl">
            <XCircle className="text-red-500 shrink-0" size={32}/> Ban qilinganlar
          </h2>
          <div className="bg-slate-900/60 rounded-3xl md:rounded-[40px] border border-white/10 overflow-hidden shadow-2xl backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr className="text-red-400 font-black uppercase text-[9px] md:text-[10px] tracking-[0.3em]">
                    <th className="p-5 md:p-8">O'quvchi</th>
                    <th className="p-5 md:p-8">Telefon Raqami</th>
                    <th className="p-5 md:p-8 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white font-bold">
                  {bannedUsers?.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5 transition-all group">
                      <td className="p-5 md:p-8 text-sm md:text-xl font-[1000] uppercase tracking-tighter text-red-100">{user.studentName}</td>
                      <td className="p-5 md:p-8 text-slate-400 tracking-widest text-xs md:text-sm">{user.phone}</td>
                      <td className="p-5 md:p-8 text-right">
                        <button 
                          onClick={() => handleUnban(user.id)} 
                          className="bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs uppercase tracking-widest transition-all font-black border border-green-500/20"
                        >
                          Bandan yechish
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!bannedUsers || bannedUsers.length === 0) && (
                    <tr>
                      <td colSpan="3" className="p-12 md:p-20 text-center text-slate-500 font-black uppercase text-xs md:text-sm tracking-[0.3em]">
                        Hozircha ban qilinganlar yo'q
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. TEACHER MANAGEMENT (MANAGE) SECTION */}
      {adminTab === 'manage' && (
        <div className="space-y-8 md:space-y-10">
          <h2 className="text-2xl md:text-4xl font-[1000] text-white italic tracking-tighter flex items-center gap-3 uppercase">
            <User size={32} className="text-blue-500 shrink-0"/> Ustozlar Boshqaruvi
          </h2>
          
          {/* Ustoz qo'shish formasi */}
          <div className="bg-slate-900/80 p-6 md:p-10 rounded-3xl md:rounded-[40px] shadow-2xl border-4 border-blue-600/20 backdrop-blur-2xl">
            <h3 className="text-lg md:text-xl font-black mb-6 md:mb-8 uppercase text-blue-400 flex items-center gap-2 italic tracking-[0.2em]"><Plus size={20}/> Yangi Ustoz qo'shish</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8 text-slate-900">
              <input placeholder="Ism Familiya" className="p-4 md:p-5 bg-white rounded-xl md:rounded-2xl font-black text-sm md:text-lg outline-none focus:ring-4 ring-blue-600/20 transition-all shadow-inner" value={newTeacher.name} onChange={e => setNewTeacher({...newTeacher, name: e.target.value})} />
              <input placeholder="Mutaxassislik" className="p-4 md:p-5 bg-white rounded-xl md:rounded-2xl font-black text-sm md:text-lg outline-none focus:ring-4 ring-blue-600/20 transition-all shadow-inner" value={newTeacher.subject} onChange={e => setNewTeacher({...newTeacher, subject: e.target.value})} />
              <input placeholder="Tel: 9989..." className="p-4 md:p-5 bg-white rounded-xl md:rounded-2xl font-black text-sm md:text-lg outline-none focus:ring-4 ring-blue-600/20 transition-all shadow-inner" value={newTeacher.phone} onChange={e => setNewTeacher({...newTeacher, phone: e.target.value})} />
              <input placeholder="Parol" className="p-4 md:p-5 bg-white rounded-xl md:rounded-2xl font-black text-sm md:text-lg outline-none focus:ring-4 ring-blue-600/20 transition-all shadow-inner" value={newTeacher.password} onChange={e => setNewTeacher({...newTeacher, password: e.target.value})} />
            </div>
            <button onClick={handleAddTeacher} className="w-full bg-blue-600 text-white py-4 md:py-6 rounded-2xl md:rounded-[28px] font-black text-sm md:text-xl hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all active:scale-95 uppercase tracking-widest">RO'YXATGA OLISH</button>
          </div>

          {/* Ustozlar kartochkalari ro'yxati */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {teachers.map(t => (
              <div key={t.id} className="bg-slate-900/60 p-6 md:p-8 rounded-3xl md:rounded-[40px] border border-white/10 hover:border-blue-50/20 transition-all group shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shrink-0"><User size={28}/></div>
                    <div><h4 className="text-xl md:text-2xl font-[1000] text-white uppercase tracking-tighter">{t.name}</h4><p className="text-blue-400 font-black text-[10px] md:text-xs uppercase tracking-widest mt-1">{t.subject}</p></div>
                  </div>
                  <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                    <button onClick={() => setEditingTeacher(t)} className="flex-1 sm:flex-none p-3 md:p-4 bg-white/5 text-blue-400 hover:bg-blue-600 hover:text-white flex justify-center rounded-xl md:rounded-2xl transition-all shadow-inner"><Edit2 size={18}/></button>
                    <button onClick={() => deleteTeacher(t.id)} className="flex-1 sm:flex-none p-3 md:p-4 bg-white/5 text-red-400 hover:bg-red-600 hover:text-white flex justify-center rounded-xl md:rounded-2xl transition-all shadow-inner"><Trash2 size={18}/></button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5 border-t border-white/5 text-slate-300 font-black">
                  <div className="flex items-center gap-2 text-xs md:text-sm"><Phone size={14} className="text-blue-500 shrink-0"/> {t.phone}</div>
                  <div className="flex items-center gap-2 text-xs md:text-sm"><Key size={14} className="text-blue-500 shrink-0"/> {t.password}</div>
                  <div className="flex items-center gap-2 text-xs md:text-sm sm:col-span-2 uppercase tracking-widest text-[9px] md:text-[10px] opacity-60 mt-1"><Clock size={14} className="text-blue-500 shrink-0"/> {t.startTime} - {t.endTime}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TEACHER EDIT MODAL */}
      {editingTeacher && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl md:rounded-[48px] shadow-2xl border-t-[8px] md:border-t-[12px] border-blue-600 overflow-hidden text-slate-900 animate-in zoom-in duration-300">
            <div className="p-6 md:p-14 font-black h-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 md:mb-10 text-slate-900">
                <h3 className="text-2xl md:text-4xl font-[1000] italic tracking-tighter uppercase">Tahrirlash</h3>
                <button onClick={() => setEditingTeacher(null)} className="p-3 md:p-4 bg-slate-100 text-slate-400 hover:text-red-500 rounded-2xl md:rounded-3xl transition-all"><XCircle size={28}/></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-10 text-slate-900">
                <div className="space-y-1"><label className="text-[9px] md:text-[10px] uppercase text-slate-400">Ism Familiya</label><input className="w-full p-4 md:p-5 bg-slate-50 rounded-xl md:rounded-2xl border-2 border-transparent focus:border-blue-600 outline-none transition-all text-sm md:text-base" value={editingTeacher.name} onChange={e => setEditingTeacher({...editingTeacher, name: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[9px] md:text-[10px] uppercase text-slate-400">Mutaxassislik</label><input className="w-full p-4 md:p-5 bg-slate-50 rounded-xl md:rounded-2xl border-2 border-transparent focus:border-blue-600 outline-none transition-all text-sm md:text-base" value={editingTeacher.subject} onChange={e => setEditingTeacher({...editingTeacher, subject: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[9px] md:text-[10px] uppercase text-slate-400">Telefon</label><input className="w-full p-4 md:p-5 bg-slate-50 rounded-xl md:rounded-2xl border-2 border-transparent focus:border-blue-600 outline-none transition-all text-sm md:text-base" value={editingTeacher.phone} onChange={e => setEditingTeacher({...editingTeacher, phone: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[9px] md:text-[10px] uppercase text-slate-400">Parol</label><input className="w-full p-4 md:p-5 bg-slate-50 rounded-xl md:rounded-2xl border-2 border-transparent focus:border-blue-600 outline-none transition-all text-sm md:text-base" value={editingTeacher.password} onChange={e => setEditingTeacher({...editingTeacher, password: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[9px] md:text-[10px] uppercase text-slate-400">Ish boshlash</label><input type="time" className="w-full p-4 md:p-5 bg-slate-50 rounded-xl md:rounded-2xl border-2 border-transparent focus:border-blue-600 outline-none transition-all text-sm md:text-base" value={editingTeacher.startTime} onChange={e => setEditingTeacher({...editingTeacher, startTime: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[9px] md:text-[10px] uppercase text-slate-400">Ish tugatish</label><input type="time" className="w-full p-4 md:p-5 bg-slate-50 rounded-xl md:rounded-2xl border-2 border-transparent focus:border-blue-600 outline-none transition-all text-sm md:text-base" value={editingTeacher.endTime} onChange={e => setEditingTeacher({...editingTeacher, endTime: e.target.value})} /></div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <button onClick={handleUpdateTeacher} className="flex-1 bg-blue-600 text-white py-4 md:py-6 rounded-2xl md:rounded-[28px] font-black text-sm md:text-xl shadow-xl hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-tighter flex items-center justify-center gap-2"><Save size={20}/> Saqlash</button>
                <button onClick={() => setEditingTeacher(null)} className="w-full sm:w-auto px-10 bg-slate-100 text-slate-500 py-4 md:py-6 rounded-2xl md:rounded-[28px] font-black hover:bg-slate-200 transition-all uppercase text-xs">Bekor qilish</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;