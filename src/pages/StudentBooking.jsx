import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { ArrowLeft, ChevronRight, User, Clock, Lock, Send } from 'lucide-react';
import { functions } from '../firebase';

const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const TELEGRAM_BOT_USERNAME = 'registonbandbot'; // @registonbandbot — Registon Registration

const StudentBooking = ({ 
  setCurrentPage, bookingType, setBookingType, teachers, selectedTeacher, 
  setSelectedTeacher, getDaysInMonth, selectedDate, setSelectedDate, 
  generateTimeSlots, bookings, groups, selectedTime, setSelectedTime, 
  selectedTopic, setSelectedTopic, studentName, setStudentName, 
  studentPhone, setStudentPhone, originGroup, setOriginGroup, handleBookingSubmit, bannedUsers
}) => {
  const [studentPassword, setStudentPassword] = useState('');
  const [topicType, setTopicType] = useState('Speaking');
  const [customTopic, setCustomTopic] = useState('');
  const GROUP_DURATION_MINS = 120; // Guruh darsi doim 2 soat
  // Telegram tasdiqlash (yangi o'quvchilar uchun)
  const [telegramVerified, setTelegramVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // "15-Mart" formatidagi sanani Date ga aylantirish
  const parseGroupDate = (dateStr) => {
    if (!dateStr) return null;
    const [dayStr, monthName] = dateStr.split('-');
    const day = parseInt(dayStr, 10);
    const monthIndex = monthNames.indexOf(monthName);
    if (monthIndex === -1 || isNaN(day)) return null;
    const year = new Date().getFullYear();
    return new Date(year, monthIndex, day);
  };

  // Guruh sanasi bugun yoki bugundan keyin, joriy oy oxirigacha bo'lsa true
  const isGroupDateValid = (dateStr) => {
    const groupDate = parseGroupDate(dateStr);
    if (!groupDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    groupDate.setHours(0, 0, 0, 0);
    return groupDate >= today && groupDate <= endOfMonth;
  };

  // O'quvchini telefon raqami orqali qidirish
  const existingUser = bookings.find(b => b.phone === studentPhone);
  const isExistingUser = !!existingUser;

  // Agar telefon raqam 9 ta bo'lsa va o'quvchi bazada topilsa, ma'lumotlarini avtomatik to'ldirish
  useEffect(() => {
    if (studentPhone.length < 9) return;
    const user = bookings.find(b => b.phone === studentPhone);
    if (user) {
      setStudentName(user.student);
      setOriginGroup(user.originGroup || "Bazada ko'rsatilmagan");
    }
  }, [studentPhone, bookings, setStudentName, setOriginGroup]);

  // Telefon o'zgarganda Telegram tasdiqlashni qayta so'rash
  useEffect(() => {
    setTelegramVerified(false);
    setVerificationCode('');
    setVerifyError('');
  }, [studentPhone]);

  // Vaqtni hisoblash uchun yordamchi funksiyalar
  const timeToMins = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const formatTime = (mins) => {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // Biror vaqtning bandligini tekshirish
  const isSlotTaken = (time) => {
    const slotMins = timeToMins(time);
    return bookings.some(b => {
      if (b.teacherId !== selectedTeacher.id || b.date !== selectedDate) return false;
      const bStart = timeToMins(b.time);
      const bEnd = b.endTime ? timeToMins(b.endTime) : bStart + 30; // individual = 30m
      return slotMins >= bStart && slotMins < bEnd;
    });
  };

  // Guruh ochishda to'liq blok (masalan 2 soat) bo'sh ekanligini tekshirish
  const isDurationFree = (startTime, durationMins) => {
    const startMins = timeToMins(startTime);
    const endMins = startMins + Number(durationMins);
    
    if (endMins > timeToMins(selectedTeacher.endTime)) return false;

    return !bookings.some(b => {
      if (b.teacherId !== selectedTeacher.id || b.date !== selectedDate) return false;
      const bStart = timeToMins(b.time);
      const bEnd = b.endTime ? timeToMins(b.endTime) : bStart + 30;
      return startMins < bEnd && bStart < endMins;
    });
  };

  const handleVerifyTelegram = async () => {
    const code = verificationCode.replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) {
      setVerifyError('Kod 6 ta raqamdan iborat bo\'lishi kerak.');
      return;
    }
    setVerifyError('');
    setVerifyLoading(true);
    try {
      const verifyTelegramCode = httpsCallable(functions, 'verifyTelegramCode');
      await verifyTelegramCode({ phone: studentPhone, code });
      setTelegramVerified(true);
      setVerificationCode('');
    } catch (err) {
      const msg = err?.details?.message ?? err?.message ?? err?.code ?? 'Tasdiqlash xatosi';
      setVerifyError(typeof msg === 'string' ? msg : 'Kod noto\'g\'ri yoki muddati tugagan.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const onBookingClick = () => {
    // BAN QILINGANINI TEKSHIRISH
    if (bannedUsers?.some(b => b.phone === studentPhone)) {
      return alert("Siz 3 marta dars qoldirganingiz uchun BLOKLANGANSIZ! Yangi dars band qila olmaysiz.");
    }

    let finalTopic = topicType === 'Boshqa' ? customTopic : topicType;
    let calculatedEndTime = null;
    
    if (bookingType === 'individual') {
       calculatedEndTime = formatTime(timeToMins(selectedTime) + 30);
    } else if (bookingType === 'group_create') {
       calculatedEndTime = formatTime(timeToMins(selectedTime) + GROUP_DURATION_MINS);
    }
    
    handleBookingSubmit(studentPassword, finalTopic, calculatedEndTime);
  };

  return (
    <div className="min-h-screen p-6 md:p-12 animate-in fade-in">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => setCurrentPage('landing')} className="flex items-center gap-2 text-gray-400 mb-8 font-bold">
          <ArrowLeft size={20}/> ORQAGA
        </button>
        <div className="bg-white rounded-[40px] shadow-2xl p-8 md:p-12 border-4 border-white">
          <h2 className="text-4xl font-black text-slate-800 mb-10 tracking-tighter italic">Ro'yxatdan o'tish</h2>
          
          <div className="flex gap-4 mb-10 flex-col md:flex-row">
            <button onClick={() => setBookingType('individual')} className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all ${bookingType === 'individual' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-100'}`}>INDIVIDUAL</button>
            <button onClick={() => setBookingType('group_create')} className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all ${bookingType === 'group_create' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-100'}`}>GURUH YARATISH</button>
            <button onClick={() => setBookingType('group_join')} className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all ${bookingType === 'group_join' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-100'}`}>GURUHGA QO'SHILISH</button>
          </div>

          <div className="mb-12">
            <h3 className="font-black text-gray-400 uppercase text-xs mb-6 tracking-widest border-l-4 border-blue-600 pl-3">1. Ustozni tanlang</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {teachers.map(t => (
                <div key={t.id} onClick={() => setSelectedTeacher(t)} className={`cursor-pointer p-6 border-4 rounded-3xl transition-all ${selectedTeacher?.id === t.id ? 'border-blue-600 bg-blue-50 shadow-xl scale-[1.02]' : 'border-slate-50 hover:border-blue-200'}`}>
                  <p className="font-black text-xl text-slate-800 tracking-tight">{t.name}</p>
                  <p className="text-xs font-bold text-blue-500 mt-1 uppercase tracking-widest">{t.subject}</p>
                </div>
              ))}
            </div>
          </div>

          {selectedTeacher && (bookingType === 'individual' || bookingType === 'group_create') && (
            <div className="animate-in fade-in">
              <h3 className="font-black text-gray-400 uppercase text-xs mb-6 tracking-widest border-l-4 border-blue-600 pl-3">2. Mavzuni tanlang</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {['Speaking', 'Listening', 'Writing', 'Reading', 'Grammar', 'Boshqa'].map(t => (
                  <button key={t} onClick={() => setTopicType(t)} className={`py-3 rounded-xl font-bold border-2 transition-all ${topicType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-transparent hover:border-blue-300'}`}>{t}</button>
                ))}
              </div>
              {topicType === 'Boshqa' && (
                <input type="text" placeholder="Mavzu nomini kiriting..." className="w-full p-4 mb-8 bg-slate-50 rounded-2xl outline-none font-bold border-2 focus:border-blue-600" value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} />
              )}

              <h3 className="font-black text-gray-400 uppercase text-xs mb-6 tracking-widest border-l-4 border-blue-600 pl-3">3. Sana va Vaqt</h3>
              <div className="flex gap-3 overflow-x-auto pb-6 mb-8 scrollbar-hide">
                {getDaysInMonth().map(day => (
                  <button key={day} onClick={() => setSelectedDate(day)} className={`flex-shrink-0 px-6 py-4 rounded-2xl font-bold border-2 transition-all ${selectedDate === day ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-100 hover:border-blue-300'}`}>{day}</button>
                ))}
              </div>
              {selectedDate && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-12 text-center">
                  {generateTimeSlots(selectedTeacher.startTime, selectedTeacher.endTime).map(time => {
                    let isDisabled = isSlotTaken(time);
                    if (bookingType === 'group_create' && !isDisabled) {
                      isDisabled = !isDurationFree(time, GROUP_DURATION_MINS);
                    }
                    
                    return (
                      <button key={time} disabled={isDisabled} onClick={() => setSelectedTime(time)} className={`py-3 rounded-xl font-bold border-2 transition-all ${isDisabled ? 'bg-slate-100 text-slate-300 cursor-not-allowed line-through' : selectedTime === time ? 'bg-blue-900 text-white border-blue-900 shadow-lg' : 'bg-slate-50 border-transparent hover:bg-white hover:border-blue-400'}`}>
                        {time} {isDisabled && <p className="text-[8px] font-black uppercase">Band</p>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {selectedTeacher && bookingType === 'group_join' && (
            <div className="animate-in fade-in mb-10">
              <h3 className="font-black text-gray-400 uppercase text-xs mb-6 tracking-widest border-l-4 border-blue-600 pl-3">2. Guruhni tanlang (Max 10 kishi)</h3>
              <p className="text-slate-500 text-xs font-bold mb-4">Faqat bugundan joriy oy oxirigacha bo'lgan guruhlar ko'rsatiladi.</p>
              <div className="grid gap-4">
                {groups
                  .filter(g => g.teacherId === selectedTeacher.id && isGroupDateValid(g.date))
                  .map(g => {
                  const studentCount = bookings.filter(b => b.groupId === g.id).length;
                  if (studentCount >= 10) return null; 
                  return (
                    <div key={g.id} onClick={() => setSelectedTopic(g.id)} className={`p-6 border-4 rounded-3xl cursor-pointer transition-all ${selectedTopic === g.id ? 'border-blue-600 bg-blue-50' : 'border-slate-50 hover:border-blue-100'}`}>
                      <p className="font-black text-xl text-slate-800">{g.name} <span className="text-sm text-blue-600">({studentCount}/10 kishi)</span></p>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-tighter mt-1">Sana: {g.date} | Vaqt: {g.startTime} - {g.endTime}</p>
                    </div>
                  );
                })}
                {groups.filter(g => g.teacherId === selectedTeacher.id && isGroupDateValid(g.date)).length === 0 && (
                  <p className="text-slate-400 font-bold p-4 bg-slate-50 rounded-2xl text-center">Ushbu ustozda hozircha qo'shilish uchun ochiq guruhlar yo'q. "GURUH YARATISH" orqali o'zingiz guruh boshlashingiz mumkin.</p>
                )}
              </div>
            </div>
          )}

          {((selectedTime && (bookingType === 'individual' || bookingType === 'group_create')) || (selectedTopic && bookingType === 'group_join')) && (
            <div className="space-y-6 animate-in fade-in border-t-2 pt-8">
              <h3 className="font-black text-gray-400 uppercase text-xs mb-6 tracking-widest border-l-4 border-blue-600 pl-3">Shaxsiy Ma'lumotlar</h3>
              
              <div>
                <label className="text-xs font-black text-slate-400 uppercase ml-2 mb-2 block">Telefon Raqamingiz</label>
                <input 
                  type="tel" 
                  placeholder="901234567" 
                  className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold focus:border-blue-600 border-2 border-transparent transition-all text-xl tracking-widest" 
                  value={studentPhone} 
                  onChange={(e) => setStudentPhone(e.target.value)} 
                  maxLength="9" 
                />
              </div>

              {studentPhone.length >= 9 && (
                <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                  {isExistingUser ? (
                    <>
                      <div className="bg-blue-50 p-5 rounded-2xl border-2 border-blue-100">
                        <p className="text-blue-800 font-bold text-sm">Xush kelibsiz qayta, <span className="font-black uppercase text-lg ml-1">{existingUser.student}</span>!</p>
                        <p className="text-blue-600/80 text-xs font-bold mt-1">Sizning ma'lumotlaringiz bazada bor. Tasdiqlash uchun parolingizni kiritishingiz kifoya.</p>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-[38px] text-slate-400" size={20} />
                        <label className="text-xs font-black text-slate-400 uppercase ml-2 mb-2 block">Xavfsizlik Paroli</label>
                        <input 
                          type="password" 
                          placeholder="Oldingi parolingizni kiriting" 
                          className="w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold border-2 border-transparent focus:border-blue-600 transition-all" 
                          value={studentPassword} 
                          onChange={(e) => setStudentPassword(e.target.value)} 
                        />
                      </div>
                      <button onClick={onBookingClick} className="w-full bg-green-500 text-white py-6 rounded-[24px] font-black text-xl shadow-2xl transition-all hover:bg-green-600 active:scale-95 uppercase tracking-widest mt-4">
                        BRON QILISHNI TASDIQLASH
                      </button>
                    </>
                  ) : !telegramVerified ? (
                    <>
                      <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 space-y-4">
                        <p className="font-black text-slate-800 text-sm uppercase tracking-tight">Raqam bazada topilmadi — Telegram orqali tasdiqlang</p>
                        <p className="text-slate-600 text-sm font-bold">
                          Quyidagi tugma orqali botga o'ting, «Raqamingizni yuborish» tugmasini bosing. Bot sizga kod yuboradi va saytga qaytish havolasini beradi. Keyin bu sahifada raqam avtomat ko'rinadi va kodni kiriting.
                        </p>
                        <a href={`https://t.me/${TELEGRAM_BOT_USERNAME}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl transition-all hover:bg-blue-700 active:scale-95 uppercase tracking-widest">
                          Telegram botga o'tish
                        </a>
                        <p className="text-slate-500 text-xs font-bold">Bot 6 xonali kod yuboradi va saytga qaytish havolasini beradi. Kodni quyida kiriting.</p>
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase ml-2 mb-2 block">Tasdiqlash kodi</label>
                        <input 
                          type="text" 
                          inputMode="numeric" 
                          placeholder="123456" 
                          maxLength="6" 
                          className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold border-2 border-transparent focus:border-blue-600 transition-all text-center text-xl tracking-[0.4em]" 
                          value={verificationCode} 
                          onChange={(e) => { setVerificationCode(e.target.value.replace(/\D/g, '')); setVerifyError(''); }} 
                        />
                      </div>
                      {verifyError && <p className="text-red-500 text-sm font-bold">{verifyError}</p>}
                      <button 
                        onClick={handleVerifyTelegram} 
                        disabled={verifyLoading || verificationCode.replace(/\D/g, '').length !== 6} 
                        className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl transition-all hover:bg-blue-700 active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {verifyLoading ? 'Tekshirilmoqda...' : <><Send size={20} /> Tasdiqlash</>}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Ismingiz</label>
                          <input type="text" placeholder="Ism Familiya" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold focus:border-blue-600 border-2 border-transparent transition-all" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">O'quv Markazdagi Guruhingiz</label>
                          <input type="text" placeholder="Masalan: 124-guruh" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold focus:border-blue-600 border-2 border-transparent transition-all" value={originGroup} onChange={(e) => setOriginGroup(e.target.value)} />
                        </div>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-[38px] text-slate-400" size={20} />
                        <label className="text-xs font-black text-slate-400 uppercase ml-2 mb-2 block">Xavfsizlik Paroli</label>
                        <input 
                          type="password" 
                          placeholder="Yangi parol o'rnating" 
                          className="w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold border-2 border-transparent focus:border-blue-600 transition-all" 
                          value={studentPassword} 
                          onChange={(e) => setStudentPassword(e.target.value)} 
                        />
                      </div>
                      <button onClick={onBookingClick} className="w-full bg-green-500 text-white py-6 rounded-[24px] font-black text-xl shadow-2xl transition-all hover:bg-green-600 active:scale-95 uppercase tracking-widest mt-4">
                        BRON QILISHNI TASDIQLASH
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentBooking;