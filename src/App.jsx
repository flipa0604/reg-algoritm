import React, { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { 
  collection, addDoc, onSnapshot, updateDoc, doc, query, orderBy 
} from "firebase/firestore";
import { 
  ChevronRight, LogOut, User as UserIcon, GraduationCap, 
  Users, Layers, ShieldCheck, Star 
} from 'lucide-react';

// Sahifalar va Komponentlarni import qilish
import AdminPanel from './pages/AdminPanel';
import TeacherPanel from './pages/TeacherPanel';
import StudentBooking from './pages/StudentBooking';
import LoginPage from './pages/LoginPage';
import StudentPanel from './pages/StudentPanel';

const App = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [inputPassword, setInputPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // DATA STATE
  const [teachers, setTeachers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [groups, setGroups] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]); // YANGI QO'SHILDI

  // STUDENT SELECTIONS STATE
  const [bookingType, setBookingType] = useState('individual'); // individual, group_create, group_join
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [originGroup, setOriginGroup] = useState(''); // Qaysi guruhdan kelgani

  // FIREBASE REAL-TIME ALOQA
  useEffect(() => {
    onSnapshot(collection(db, "teachers"), (s) => setTeachers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, "bookings"), orderBy("createdAt", "desc")), (s) => setBookings(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, "groups"), (s) => setGroups(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, "banned_users"), (s) => setBannedUsers(s.docs.map(d => ({ id: d.id, ...d.data() })))); // YANGI QO'SHILDI
  }, []);

  // URL ?phone=901234567 — booking sahifasida raqamni avtomat to'ldirish
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phoneParam = params.get('phone');
    if (phoneParam) {
      const clean = phoneParam.replace(/\D/g, '').slice(-9);
      if (clean.length === 9) {
        setStudentPhone(clean);
        setCurrentPage('student-booking');
      }
    }
  }, []);

  // YORDAMCHI FUNKSIYALAR
  const generateTimeSlots = (start, end) => {
    if (!start || !end) return [];
    const slots = [];
    let [startH, startM] = start.split(':').map(Number);
    let [endH, endM] = end.split(':').map(Number);
    let current = startH * 60 + startM;
    const finish = endH * 60 + endM;
    while (current < finish) {
      let h = Math.floor(current / 60);
      let m = current % 60;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      current += 30;
    }
    return slots;
  };

  const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
  const getDaysInMonth = () => {
    const days = [];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = monthNames[month];
    for (let d = now.getDate(); d <= daysInMonth; d++) days.push(`${d}-${monthName}`);
    return days;
  };

  const handleBookingSubmit = async (password, finalTopic, calculatedEndTime) => {
    if (!studentName || studentPhone.length < 9 || !password || !originGroup) {
      return alert("Barcha maydonlarni to'ldiring (Ism, Tel, Parol va Qaysi guruhdan ekansiz)!");
    }

    // GURUHGA QAYTA YOZILISHNI OLDINI OLISH
    if (bookingType === 'group_join') {
      const isAlreadyJoined = bookings.some(b => b.phone === studentPhone && b.groupId === selectedTopic);
      if (isAlreadyJoined) {
        return alert("Siz bu darsga yozilgansiz!");
      }
    }

    const existingUser = bookings.find(b => b.phone === studentPhone);
    if (existingUser && existingUser.password !== password) {
      return alert("Xato parol! Iltimos, ushbu raqam uchun oldin o'rnatilgan parolni kiritasiz.");
    }
    
    try {
      const commonData = {
        student: studentName, phone: studentPhone, teacherId: selectedTeacher.id,
        password: password, attended: null, createdAt: new Date(),
        originGroup: originGroup, topic: finalTopic
      };

      if (bookingType === 'individual') {
        await addDoc(collection(db, "bookings"), { ...commonData, date: selectedDate, time: selectedTime, endTime: calculatedEndTime, type: 'individual', groupId: null });
      } else if (bookingType === 'group_create') {
        // Avval guruh yaratamiz
        const groupRef = await addDoc(collection(db, "groups"), {
          name: finalTopic, teacherId: selectedTeacher.id, date: selectedDate,
          startTime: selectedTime, endTime: calculatedEndTime, createdBy: studentPhone, createdAt: new Date()
        });
        // So'ngra yaratuvchini o'sha guruhga birinchi bo'lib qo'shamiz
        await addDoc(collection(db, "bookings"), { ...commonData, date: selectedDate, time: selectedTime, endTime: calculatedEndTime, type: 'group_join', groupId: groupRef.id });
      } else if (bookingType === 'group_join') {
        // Tayyor guruhga qo'shilish
        const targetGroup = groups.find(g => g.id === selectedTopic);
        await addDoc(collection(db, "bookings"), { ...commonData, date: targetGroup.date, time: targetGroup.startTime, endTime: targetGroup.endTime, topic: targetGroup.name, type: 'group_join', groupId: targetGroup.id });
      }
      
      alert("Muvaffaqiyatli band qilindi!");
      setStudentName(''); setStudentPhone(''); setSelectedTime(null); setOriginGroup(''); setCurrentPage('landing');
    } catch { alert("Xatolik yuz berdi!"); }
  };

  const handleProtectedLogin = (role, phone, password) => {
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    if (role === 'admin' && adminPassword && password === adminPassword) {
      setCurrentUser({ role: 'admin', name: 'Admin' });
      setCurrentPage('admin-panel');
      setLoginError(false);
    } else if (role === 'teacher') {
      const t = teachers.find(t => t.phone === phone && t.password === password);
      if (t) { setCurrentUser({ ...t, role: 'teacher' }); setCurrentPage('teacher-panel'); setLoginError(false); }
      else setLoginError(true);
    } else if (role === 'student') {
      const s = bookings.find(b => b.phone === phone && b.password === password);
      if (s) { setCurrentUser({ ...s, role: 'student' }); setCurrentPage('student-panel'); setLoginError(false); }
      else setLoginError(true);
    } else { setLoginError(true); }
    setInputPassword('');
  };

  // BAN QILISH LOGIKASI QO'SHILDI
  const markAttendance = async (id, status) => {
    await updateDoc(doc(db, "bookings", id), { attended: status });

    if (status === false) {
      const currentBooking = bookings.find(b => b.id === id);
      if (currentBooking) {
        const phone = currentBooking.phone;
        const alreadyMissed = bookings.filter(b => b.phone === phone && b.attended === false).length;
        const totalMissed = currentBooking.attended === false ? alreadyMissed : alreadyMissed + 1;

        if (totalMissed >= 3) {
          const isAlreadyBanned = bannedUsers.some(b => b.phone === phone);
          if (!isAlreadyBanned) {
            await addDoc(collection(db, "banned_users"), {
              phone: phone,
              studentName: currentBooking.student,
              bannedAt: new Date()
            });
            alert(`Diqqat! O'quvchi ${currentBooking.student} 3 marta dars qoldirgani uchun BAN qilindi.`);
          }
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans">
      {/* NAVIGATION PANEL */}
      {(currentPage.includes('panel')) && currentUser && (
        <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 p-4 sticky top-0 z-50 flex justify-between items-center px-6 md:px-12 shadow-2xl">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-xl"><GraduationCap className="text-white"/></div>
             <h1 className="text-xl font-black italic tracking-tighter text-white uppercase">REGISTON {currentUser.role}</h1>
          </div>
          <div className="flex items-center gap-6">
            <span className="hidden md:flex items-center gap-2 text-xs font-black text-blue-400 bg-blue-400/10 px-4 py-2 rounded-full border border-blue-400/20 uppercase tracking-widest">
              <UserIcon size={14}/> {currentUser.name || currentUser.student}
            </span>
            <button onClick={() => {setCurrentPage('landing'); setCurrentUser(null);}} className="flex items-center gap-2 font-black text-red-400 hover:text-red-300 transition-all text-xs tracking-widest uppercase"><LogOut size={16}/> CHIQISH</button>
          </div>
        </nav>
      )}

      {/* LANDING PAGE */}
      {currentPage === 'landing' && (
        <div className="min-h-screen relative bg-[#0a0f1d] overflow-x-hidden text-slate-200">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]"></div>
          </div>

          <nav className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto gap-6 md:gap-0">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2.5 rounded-2xl shadow-[0_0_25px_rgba(37,99,235,0.4)]">
                <GraduationCap size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-[1000] text-white italic tracking-tighter bg-gradient-to-r from-white via-white to-blue-400 bg-clip-text text-transparent uppercase">REGISTON</h1>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-4 md:gap-10">
              <button onClick={() => setCurrentPage('login-student')} className="text-base md:text-lg font-black uppercase tracking-[0.2em] text-white hover:text-blue-300 transition-all">Kabinet</button>
              <button onClick={() => setCurrentPage('login-teacher')} className="text-base md:text-lg font-black uppercase tracking-[0.2em] text-white hover:text-blue-300 transition-all">Ustoz</button>
              <button onClick={() => setCurrentPage('login-admin')} className="px-5 py-2.5 md:px-6 md:py-3 bg-white/10 border border-white/20 rounded-xl text-base md:text-lg font-black uppercase tracking-widest text-white hover:bg-white/20 transition-all">Admin</button>
            </div>
          </nav>

          <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-32 text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-12">
               Kelajak ta'limi shu yerdan boshlanadi
            </div>

            <h2 className="text-6xl md:text-9xl font-[1000] text-white leading-[0.9] tracking-[-0.05em] mb-12">
              BILIMNI <br /> 
              <span className="bg-gradient-to-b from-blue-400 to-blue-700 bg-clip-text text-transparent">REGISTON</span> <br /> 
              BILAN QURING
            </h2>

            <p className="text-slate-400 text-lg md:text-xl font-black max-w-2xl mx-auto mb-16 opacity-90">
              Innovatsion ta'lim platformasi orqali eng kuchli ustozlardan bilim oling. 
            </p>

            <div className="flex flex-col md:flex-row justify-center gap-6 mb-24">
              <button onClick={() => setCurrentPage('student-booking')} className="group px-12 py-7 bg-blue-600 text-white rounded-[32px] font-black text-xl shadow-lg hover:scale-105 transition-all">
                DARSNI BAND QILISH <ChevronRight size={24} className="inline ml-2"/>
              </button>
              <button onClick={() => setCurrentPage('login-student')} className="px-12 py-7 bg-white/5 text-white border border-white/10 rounded-[32px] font-black text-xl backdrop-blur-xl hover:bg-white/10 transition-all">
                SHAXSIY KABINET
              </button>
            </div>
          </main>
        </div>
      )}

      {/* MODULLAR */}
      {currentPage === 'student-booking' && (
        <StudentBooking 
          setCurrentPage={setCurrentPage} bookingType={bookingType} setBookingType={setBookingType}
          teachers={teachers} selectedTeacher={selectedTeacher} setSelectedTeacher={setSelectedTeacher}
          getDaysInMonth={getDaysInMonth} selectedDate={selectedDate} setSelectedDate={setSelectedDate}
          generateTimeSlots={generateTimeSlots} bookings={bookings} groups={groups}
          selectedTime={selectedTime} setSelectedTime={setSelectedTime}
          selectedTopic={selectedTopic} setSelectedTopic={setSelectedTopic}
          studentName={studentName} setStudentName={setStudentName}
          studentPhone={studentPhone} setStudentPhone={setStudentPhone}
          originGroup={originGroup} setOriginGroup={setOriginGroup}
          handleBookingSubmit={handleBookingSubmit}
          bannedUsers={bannedUsers} /* QO'SHILDI */
        />
      )}

      {(currentPage.includes('login')) && (
        <LoginPage 
          currentPage={currentPage} setCurrentPage={setCurrentPage}
          inputPassword={inputPassword} setInputPassword={setInputPassword}
          loginError={loginError} setLoginError={setLoginError}
          handleProtectedLogin={handleProtectedLogin}
          bannedUsers={bannedUsers} /* QO'SHILDI */
        />
      )}

      {/* PANELS */}
      {currentPage === 'admin-panel' && currentUser?.role === 'admin' && (
        <div className="max-w-7xl mx-auto p-6 md:p-12"><AdminPanel teachers={teachers} groups={groups} bookings={bookings} bannedUsers={bannedUsers} /></div>
      )}

      {currentPage === 'teacher-panel' && currentUser?.role === 'teacher' && (
        <div className="max-w-7xl mx-auto p-6 md:p-12"><TeacherPanel currentUser={currentUser} teachers={teachers} groups={groups} bookings={bookings} markAttendance={markAttendance} /></div>
      )}

      {currentPage === 'student-panel' && currentUser?.role === 'student' && (
        <div className="max-w-7xl mx-auto p-6 md:p-12"><StudentPanel currentUser={currentUser} teachers={teachers} bookings={bookings} /></div>
      )}
    </div>
  );
};

export default App;