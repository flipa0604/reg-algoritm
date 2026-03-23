import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { User, Calendar, Clock, Users, Trash2, Star, XCircle } from 'lucide-react';

const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

const StudentPanel = ({ currentUser, teachers, bookings }) => {
  const [ratingModal, setRatingModal] = useState(null); // { booking, teacher } yoki null
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  // "15-Mart" formatidagi sanani Date ga aylantirish
  const parseBookingDate = (dateStr) => {
    if (!dateStr) return null;
    const [dayStr, monthName] = dateStr.split('-');
    const day = parseInt(dayStr, 10);
    const monthIndex = monthNames.indexOf(monthName);
    if (monthIndex === -1 || isNaN(day)) return null;
    const year = new Date().getFullYear();
    return new Date(year, monthIndex, day);
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Faqat bugun va bugundan keyingi darslar
  const myBookings = bookings
    .filter(b => b.phone === currentUser.phone)
    .filter(b => {
      const d = parseBookingDate(b.date);
      return d && d >= todayStart;
    })
    .sort((a, b) => parseBookingDate(a.date) - parseBookingDate(b.date));

  // DARSNI BEKOR QILISH FUNKSIYASI
  const handleCancelBooking = async (id) => {
    if (window.confirm("Haqiqatan ham bu darsni bekor qilmoqchimisiz?")) {
      await deleteDoc(doc(db, "bookings", id));
      alert("Dars muvaffaqiyatli bekor qilindi!");
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingModal) return;
    const { booking } = ratingModal;
    if (ratingValue < 2 || ratingValue > 5) return alert("Ball 2 dan 5 gacha bo'lishi kerak.");
    await updateDoc(doc(db, "bookings", booking.id), {
      rating: ratingValue,
      ratingComment: ratingComment.trim() || null,
      ratedAt: new Date()
    });
    setRatingModal(null);
    setRatingValue(5);
    setRatingComment('');
    alert("Baholash yuborildi! Rahmat.");
  };

  return (
    <div className="animate-in fade-in space-y-8">
      <div className="bg-white p-8 rounded-[40px] shadow-xl border-b-8 border-green-500">
        <h2 className="text-3xl font-black text-slate-800 uppercase italic flex items-center gap-3">
          <User className="text-green-500"/> {currentUser.student}
        </h2>
        <p className="text-slate-500 font-bold ml-12 tracking-widest">{currentUser.phone}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myBookings.map(b => {
            const t = teachers.find(teacher => teacher.id === b.teacherId);
            
            // Bekor qilish: dars sanasi bugundan kamida 2 kun keyin bo'lishi kerak
            const bookingDate = parseBookingDate(b.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const canCancel = bookingDate && (bookingDate.getTime() - today.getTime()) >= 2 * 24 * 60 * 60 * 1000;

            return (
              <div key={b.id} className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                
                <div className="flex justify-between items-start mb-4 border-b pb-4">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase">Ustoz:</p>
                    <p className="text-xl font-bold text-slate-800">{t?.name}</p>
                    <p className="text-blue-600 font-bold text-xs uppercase mt-0.5">{b.topic}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mb-6 text-sm font-bold text-slate-600">
                   <div className="flex items-center gap-2"><Calendar size={16} className="text-blue-500"/> Sana: {b.date}</div>
                   <div className="flex items-center gap-2"><Clock size={16} className="text-blue-500"/> Vaqt: {b.time} {b.endTime && `- ${b.endTime}`}</div>
                   <div className="flex items-center gap-2"><Users size={16} className="text-blue-500"/> Guruhi: {b.originGroup || "Kiritilmagan"} ({b.type === 'individual' ? 'Individual' : 'Guruh'})</div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 space-y-2">
                  {/* Darsni baholash: har bir dars uchun 1 marta */}
                  {b.rating != null || b.ratedAt ? (
                    <div className="w-full py-3 bg-green-50 text-green-700 rounded-xl text-center font-bold text-sm flex items-center justify-center gap-2">
                      <Star size={18} className="shrink-0"/> Siz darsni baholagansiz ({b.rating}/5)
                    </div>
                  ) : (
                    <button
                      onClick={() => setRatingModal({ booking: b, teacher: t })}
                      className="w-full py-3 bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex justify-center items-center gap-2"
                    >
                      <Star size={16}/> Darsni baholash
                    </button>
                  )}
                  {canCancel ? (
                    <button 
                      onClick={() => handleCancelBooking(b.id)} 
                      className="w-full py-3 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex justify-center items-center gap-2"
                    >
                      <Trash2 size={16}/> Darsni bekor qilish
                    </button>
                  ) : (
                    <div className="w-full py-3 bg-slate-50 text-slate-400 rounded-xl text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest leading-tight px-2">
                        Darsga 2 kundan kam vaqt qolgani uchun bekor qilib bo'lmaydi
                      </p>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
          
          {myBookings.length === 0 && (
            <div className="col-span-1 md:col-span-2 bg-slate-50 p-12 text-center rounded-3xl border border-slate-100">
               <p className="text-slate-400 font-bold uppercase tracking-widest">Hozircha bugundan keyingi darslar yo'q</p>
            </div>
          )}
        </div>

      {/* Baholash modali */}
      {ratingModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 uppercase">Darsni baholash</h3>
              <button onClick={() => { setRatingModal(null); setRatingComment(''); setRatingValue(5); }} className="p-2 text-slate-400 hover:text-red-500 rounded-xl"><XCircle size={24}/></button>
            </div>
            <p className="text-slate-600 font-bold mb-4">Ustoz: {ratingModal.teacher?.name}</p>
            <p className="text-slate-500 text-sm mb-4">Ball (2 dan 5 gacha):</p>
            <div className="flex gap-2 mb-6">
              {[2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRatingValue(n)} className={`w-12 h-12 rounded-xl font-black text-lg transition-all ${ratingValue === n ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{n}</button>
              ))}
            </div>
            <label className="block text-slate-600 font-bold mb-2">Izoh (ixtiyoriy)</label>
            <textarea className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-amber-500 outline-none font-bold min-h-[100px] mb-6" placeholder="Ustoz haqida fikringiz..." value={ratingComment} onChange={e => setRatingComment(e.target.value)} />
            <button onClick={handleSubmitRating} className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-amber-600 transition-all">Yuborish</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPanel;