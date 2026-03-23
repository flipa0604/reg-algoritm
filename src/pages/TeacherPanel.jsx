import React, { useState } from 'react';
import { CheckSquare, Clock, GraduationCap, BookOpen, Users, Eye, XCircle } from 'lucide-react';

const TeacherPanel = ({ currentUser, teachers, groups, bookings, markAttendance }) => {
  const [activeTab, setActiveTab] = useState('attendance');
  
  // Guruh o'quvchilarini ko'rish uchun Modal State
  const [viewModeGroup, setViewModeGroup] = useState(null);

  // "Darslarim" bo'limi uchun filtrlash state'lari (Asosiy 'daily' qilib qo'yildi)
  const [classStatsPeriod, setClassStatsPeriod] = useState('daily');
  const [classSelectedMonth, setClassSelectedMonth] = useState(new Date().getMonth().toString());
  const [classSelectedYear, setClassSelectedYear] = useState(new Date().getFullYear().toString());
  const [classSelectedDate, setClassSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Bugun sanasini olish (O'quvchi bron qilgan format bilan bir xil bo'lishi kerak)
  const todayDate = `${new Date().getDate()}-Mart`; 

  // Faqat bugungi va aynan shu ustozga tegishli o'quvchilar (Davomat uchun)
  const todaysBookings = bookings.filter(b => b.teacherId === currentUser.id && b.date === todayDate);

  // Firebase sanalarini to'g'ri o'qish uchun yordamchi funksiya
  const parseDate = (createdAt) => {
    if (!createdAt) return new Date();
    if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
    if (typeof createdAt.toDate === 'function') return createdAt.toDate();
    return new Date(createdAt);
  };

  // Kalendardagi "YYYY-MM-DD" sanani bazadagi "12-Mart" formatiga o'girish
  const formatToBookingDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    return `${parseInt(day)}-${months[parseInt(month) - 1]}`;
  };

  // "Darslarim" ro'yxatini vaqtga qarab filtrlash va Guruhlarni qo'shish
  const getFilteredMyClasses = () => {
    const targetDateStr = formatToBookingDate(classSelectedDate); // Tanlangan kalendar sanasi (Masalan: "12-Mart")
    const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    const selectedMonthName = months[parseInt(classSelectedMonth)];

    // 1. Individual o'quvchilarni ajratish (Guruhga kirmaganlar)
    let myIndividuals = bookings.filter(b => b.teacherId === currentUser.id && (b.type === 'individual' || !b.groupId));

    let filteredIndividuals = myIndividuals.filter(b => {
      if (classStatsPeriod === 'daily') {
        return b.date === targetDateStr; // Tizim endi yaratilgan vaqtga qaramaydi, faqat rejalashtirilgan sanani tekshiradi
      }
      if (classStatsPeriod === 'monthly') {
        return b.date && b.date.includes(selectedMonthName);
      }
      return true;
    }).map(b => ({ ...b, renderType: 'individual' }));

    // 2. Guruhlarni ajratish
    let myGroups = groups.filter(g => g.teacherId === currentUser.id);

    let filteredGroups = myGroups.filter(g => {
      if (classStatsPeriod === 'daily') {
        // A) Agar guruhda o'quvchi belgilagan aniq sana bo'lsa
        if (g.date) {
          return g.date === targetDateStr; 
        }

        // B) Agar ustoz/admin ochgan haftalik doimiy guruh bo'lsa
        const [year, month, day] = classSelectedDate.split('-');
        const selectedDateObj = new Date(year, month - 1, day);
        const weekdays = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
        const selectedWeekday = weekdays[selectedDateObj.getDay()];

        if (g.days && Array.isArray(g.days) && g.days.length > 0) {
          return g.days.includes(selectedWeekday);
        }

        return false;
      }
      
      if (classStatsPeriod === 'monthly') {
        if (g.date) {
          return g.date.includes(selectedMonthName);
        }
        const gDate = parseDate(g.createdAt);
        return gDate.getMonth() === parseInt(classSelectedMonth) && gDate.getFullYear() === parseInt(classSelectedYear);
      }
      return true;
    }).map(g => ({ ...g, renderType: 'group' }));

    // 3. Ikkalasini birlashtirish
    return [...filteredIndividuals, ...filteredGroups].sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));
  };

  const filteredClasses = getFilteredMyClasses();

  return (
    <div className="animate-in fade-in space-y-6 md:space-y-10">
      
      {/* HEADER */}
      <div className="bg-slate-900/60 p-6 md:p-10 rounded-[32px] md:rounded-[48px] border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
        <div className="absolute top-0 right-0 w-48 h-48 md:w-64 h-64 bg-blue-600/10 rounded-full blur-[60px] md:blur-[80px] -mr-20 -mt-20"></div>
        <div className="relative z-10 w-20 h-20 md:w-24 md:h-24 bg-blue-600 rounded-2xl md:rounded-[32px] flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] shrink-0">
          <GraduationCap size={40} className="md:w-12 md:h-12"/>
        </div>
        <div className="relative z-10 text-center md:text-left">
          <h2 className="text-3xl md:text-5xl font-[1000] text-white tracking-tighter uppercase italic drop-shadow-lg">{currentUser.name}</h2>
          <div className="flex justify-center md:justify-start mt-3">
             <p className="bg-blue-600/20 text-blue-400 px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-widest border border-blue-500/20">Bugun: {todayDate}</p>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="flex flex-col sm:flex-row bg-slate-800/50 p-2 rounded-2xl gap-2 w-full sm:w-fit border border-white/10 mx-auto shadow-2xl backdrop-blur-md">
        <button 
          onClick={() => setActiveTab('attendance')} 
          className={`px-6 py-3.5 flex-1 rounded-xl font-[1000] text-xs uppercase transition-all tracking-widest flex items-center justify-center gap-2 ${activeTab === 'attendance' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <CheckSquare size={16} /> DAVOMAT
        </button>
        <button 
          onClick={() => setActiveTab('my_classes')} 
          className={`px-6 py-3.5 flex-1 rounded-xl font-[1000] text-xs uppercase transition-all tracking-widest flex items-center justify-center gap-2 ${activeTab === 'my_classes' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <BookOpen size={16} /> DARSLARIM
        </button>
      </div>

      {activeTab === 'attendance' && (
        <div className="space-y-4 md:space-y-6">
          <h3 className="text-2xl md:text-3xl font-[1000] text-white uppercase italic flex items-center gap-3 drop-shadow-xl px-2">
             <Clock className="text-blue-500" size={28}/> Faqat Bugun: {todayDate}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysBookings.map(b => (
              <div key={b.id} className="bg-slate-900/60 p-5 rounded-3xl border border-white/10 hover:border-blue-500/30 transition-all backdrop-blur-sm flex flex-col justify-between">
                 <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-4">
                   <div>
                     <p className="text-xl font-[1000] text-white uppercase tracking-tighter leading-tight">{b.student}</p>
                     <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mt-1 flex flex-col gap-0.5">
                       <span>{b.type === 'individual' ? 'Individual' : `Guruh (${b.topic})`}</span>
                       <span className="text-slate-400">Guruhi: {b.originGroup}</span>
                     </p>
                   </div>
                   <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 text-center shrink-0">
                     <span className="text-white font-[1000] text-sm md:text-base block">{b.time}</span>
                     {b.endTime && <span className="text-slate-400 font-bold text-[10px]">gacha {b.endTime}</span>}
                   </div>
                 </div>

                 <div className="flex gap-2">
                    <button 
                      onClick={() => markAttendance(b.id, true)} 
                      className={`flex-1 py-3 rounded-xl font-[1000] text-[10px] md:text-xs tracking-widest transition-all ${b.attended === true ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]' : 'bg-white/5 text-slate-400 hover:bg-green-600/20 hover:text-green-400 border border-white/5'}`}
                    >
                      KELDI
                    </button>
                    <button 
                      onClick={() => markAttendance(b.id, false)} 
                      className={`flex-1 py-3 rounded-xl font-[1000] text-[10px] md:text-xs tracking-widest transition-all ${b.attended === false ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'bg-white/5 text-slate-400 hover:bg-red-600/20 hover:text-red-400 border border-white/5'}`}
                    >
                      KELMADI
                    </button>
                 </div>
              </div>
            ))}
          </div>

          {todaysBookings.length === 0 && (
            <div className="bg-slate-900/60 rounded-3xl border border-white/10 p-12 md:p-32 text-center backdrop-blur-sm">
              <Clock className="mx-auto text-slate-700 mb-6 w-12 h-12 md:w-16 md:h-16" size={48} />
              <p className="text-slate-500 font-[1000] uppercase tracking-[0.2em] italic text-xs md:text-sm">Bugun uchun hech qanday dars band qilinmagan</p>
            </div>
          )}
        </div>
      )}

      {/* Darslarim bo'limi */}
      {activeTab === 'my_classes' && (
        <div className="space-y-4 md:space-y-6 animate-in zoom-in">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-2xl md:text-3xl font-[1000] text-white uppercase italic flex items-center gap-3 drop-shadow-xl px-2 w-full">
               <BookOpen className="text-purple-500 shrink-0" size={28}/> Barcha Darslarim
            </h3>
            
            <div className="flex bg-slate-900/80 rounded-2xl p-1.5 border border-white/10 w-full md:w-auto">
              {['daily', 'monthly'].map(p => (
                <button key={p} onClick={() => setClassStatsPeriod(p)} className={`flex-1 md:flex-none px-4 md:px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase transition-all ${classStatsPeriod === p ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                  {p === 'daily' ? 'Kunlik' : 'Oylik'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 px-2">
            {classStatsPeriod === 'monthly' ? (
              <>
                <select 
                  className="p-3 md:p-4 bg-slate-900/80 text-white rounded-xl md:rounded-2xl border-2 border-white/10 outline-none focus:border-purple-500 transition-all font-black text-xs md:text-sm uppercase tracking-widest cursor-pointer shadow-inner flex-1 md:flex-none md:w-48"
                  value={classSelectedMonth}
                  onChange={e => setClassSelectedMonth(e.target.value)}
                >
                  {['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'].map((m, i) => (
                    <option key={i} value={i} className="bg-slate-800">{m}</option>
                  ))}
                </select>
                <select 
                  className="p-3 md:p-4 bg-slate-900/80 text-white rounded-xl md:rounded-2xl border-2 border-white/10 outline-none focus:border-purple-500 transition-all font-black text-xs md:text-sm uppercase tracking-widest cursor-pointer shadow-inner flex-1 md:flex-none md:w-32"
                  value={classSelectedYear}
                  onChange={e => setClassSelectedYear(e.target.value)}
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y} className="bg-slate-800">{y}</option>
                  ))}
                </select>
              </>
            ) : (
              <input 
                type="date" 
                className="p-3 md:p-4 bg-slate-900/80 text-white rounded-xl md:rounded-2xl border-2 border-white/10 outline-none focus:border-purple-500 transition-all font-black text-xs md:text-sm uppercase tracking-widest cursor-pointer shadow-inner w-full md:w-auto"
                value={classSelectedDate}
                onChange={e => setClassSelectedDate(e.target.value)}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {filteredClasses.map(b => (
               b.renderType === 'individual' ? (
                 <div key={b.id} className="bg-slate-900/60 p-5 rounded-3xl border border-white/10 hover:border-purple-500/30 transition-all backdrop-blur-sm">
                   <div className="flex justify-between items-start mb-3">
                     <div>
                       <p className="text-lg font-[1000] text-white uppercase tracking-tight">{b.student}</p>
                       <p className="text-xs text-slate-400 font-black mt-0.5">{b.phone}</p>
                     </div>
                     <span className="bg-purple-500/10 text-purple-400 text-[10px] font-black uppercase px-2 py-1 rounded-md border border-purple-500/20">
                       {b.topic || 'Individual'}
                     </span>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-bold text-slate-300">
                      <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                        <p className="text-slate-500 uppercase tracking-widest mb-0.5 text-[8px]">Asl Guruhi:</p>
                        <p className="uppercase">{b.originGroup || <span className="italic opacity-50">Yo'q</span>}</p>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                        <p className="text-slate-500 uppercase tracking-widest mb-0.5 text-[8px]">Turi:</p>
                        <p className="uppercase">Individual</p>
                      </div>
                   </div>

                   <div className="bg-purple-600/10 p-2.5 rounded-xl border border-purple-500/10 flex justify-between items-center mt-4">
                      <span className="text-purple-300 font-black text-xs">{b.date}</span>
                      <span className="text-purple-300 font-black text-xs">{b.time} - {b.endTime}</span>
                   </div>
                 </div>
               ) : (
                 <div key={b.id} className="bg-slate-900/60 p-5 rounded-3xl border border-blue-500/30 hover:border-purple-500/60 transition-all backdrop-blur-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/20 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none"></div>
                   
                   <div className="flex justify-between items-start mb-3 relative z-10">
                     <div>
                       <p className="text-lg font-[1000] text-white uppercase tracking-tight flex items-center gap-2">
                         <Users size={18} className="text-purple-400"/> {b.name}
                       </p>
                       <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">Guruh Darsi</p>
                     </div>
                     <span className="bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border border-purple-500/30 shadow-lg">
                       GURUH
                     </span>
                   </div>
                   
                   <div className="mt-5 relative z-10">
                      <button onClick={() => setViewModeGroup(b)} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl text-[10px] md:text-xs uppercase tracking-widest font-[1000] transition-all shadow-xl flex justify-center items-center gap-2">
                        <Eye size={18}/> O'quvchilarni Ko'rish
                      </button>
                   </div>

                   <div className="bg-purple-600/10 p-3 rounded-xl border border-purple-500/20 flex justify-between items-center mt-4 relative z-10">
                      <span className="text-purple-300 font-black text-xs">{b.date || b.days?.join(', ')}</span>
                      <span className="text-purple-300 font-black text-xs">{b.startTime} - {b.endTime}</span>
                   </div>
                 </div>
               )
             ))}
          </div>

          {filteredClasses.length === 0 && (
            <div className="bg-slate-900/60 rounded-3xl border border-white/10 p-12 md:p-20 text-center backdrop-blur-sm">
              <BookOpen className="mx-auto text-slate-700 mb-4" size={48} />
              <p className="text-slate-500 font-[1000] uppercase tracking-[0.2em] italic text-xs md:text-sm">Ushbu vaqt uchun darslar topilmadi</p>
            </div>
          )}
        </div>
      )}

      {/* GURUH O'QUVCHILARINI KO'RISH MODALI */}
      {viewModeGroup && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[300] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-3xl md:rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-6 md:p-8 border-b bg-slate-50 flex justify-between items-center text-slate-900">
              <div>
                <h3 className="text-2xl md:text-4xl font-[1000] uppercase italic tracking-tighter text-slate-800">GURUH: {viewModeGroup.name}</h3>
                <p className="text-purple-600 font-black text-xs md:text-sm uppercase mt-1 tracking-widest flex items-center gap-2"><Users size={16}/> O'quvchilar ro'yxati</p>
              </div>
              <button onClick={() => setViewModeGroup(null)} className="p-3 bg-slate-200 hover:bg-red-100 text-slate-500 hover:text-red-600 rounded-2xl transition-all"><XCircle size={28}/></button>
            </div>
            <div className="p-0 md:p-8 max-h-[60vh] overflow-y-auto">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="text-[10px] md:text-xs font-black text-slate-400 uppercase border-b tracking-[0.2em] bg-slate-50">
                      <th className="p-5 md:py-6">O'quvchi Ism-Familiyasi</th>
                      <th className="p-5 md:py-6">Telefon Raqami</th>
                      <th className="p-5 md:py-6">Qaysi Guruhdan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-bold">
                    {bookings.filter(b => b.groupId === viewModeGroup.id).map(st => (
                      <tr key={st.id} className="hover:bg-slate-50 transition-all">
                        <td className="p-5 md:py-6 text-sm md:text-base uppercase font-[1000]">{st.student}</td>
                        <td className="p-5 md:py-6 text-sm opacity-80 font-black tracking-widest">+998 {st.phone}</td>
                        <td className="p-5 md:py-6 text-sm uppercase opacity-80">{st.originGroup || "Ko'rsatilmagan"}</td>
                      </tr>
                    ))}
                    {bookings.filter(b => b.groupId === viewModeGroup.id).length === 0 && (
                      <tr>
                        <td colSpan="3" className="p-10 text-center text-slate-400 font-black tracking-widest uppercase">Guruhda o'quvchilar topilmadi</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeacherPanel;