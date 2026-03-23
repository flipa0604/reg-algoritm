import React, { useState } from 'react';
import { LogIn, Phone, Key } from 'lucide-react';

const LoginPage = ({ currentPage, setCurrentPage, inputPassword, setInputPassword, loginError, setLoginError, handleProtectedLogin, bannedUsers }) => {
  const [inputPhone, setInputPhone] = useState(''); 
  
  const roleTitle = 
    currentPage === 'login-admin' ? 'ADMIN' : 
    currentPage === 'login-student' ? 'O\'QUVCHI' : 'USTOZ';

  const onLogin = () => {
    // BAN TEKSHIRUVI QO'SHILDI
    if (currentPage === 'login-student' && bannedUsers?.some(b => b.phone === inputPhone)) {
      setLoginError(false); 
      return alert("Siz 3 marta dars qoldirganingiz uchun BLOKLANGANSIZ! Tizimga kira olmaysiz.");
    }

    if (currentPage === 'login-admin') {
      handleProtectedLogin('admin', '', inputPassword);
    } else if (currentPage === 'login-student') {
      handleProtectedLogin('student', inputPhone, inputPassword);
    } else {
      handleProtectedLogin('teacher', inputPhone, inputPassword);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[40px] shadow-2xl w-full max-w-sm text-center animate-in zoom-in duration-300">
        <div className="bg-blue-600 w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white shadow-xl">
          <LogIn size={40}/>
        </div>
        
        <h2 className="text-2xl font-black mb-8 uppercase text-slate-800 tracking-tighter">
          {roleTitle} KIRISH
        </h2>
        
        <div className="space-y-4 mb-6 text-left">
          {currentPage !== 'login-admin' && (
            <div className="relative">
              <Phone className="absolute left-4 top-5 text-slate-400" size={20}/>
              <input 
                type="tel" 
                placeholder="Telefon (90...)" 
                className="w-full p-5 pl-12 bg-slate-50 rounded-2xl border-2 border-transparent font-bold text-lg outline-none focus:border-blue-600 focus:bg-white transition-all"
                value={inputPhone}
                onChange={(e) => {setInputPhone(e.target.value); setLoginError(false);}}
              />
            </div>
          )}
          
          <div className="relative">
            <Key className="absolute left-4 top-5 text-slate-400" size={20}/>
            <input 
              type="password" 
              placeholder="Parol" 
              className={`w-full p-5 pl-12 bg-slate-50 rounded-2xl border-2 font-bold text-center text-xl outline-none transition-all ${
                loginError ? 'border-red-500 animate-pulse bg-red-50' : 'border-transparent focus:border-blue-600 focus:bg-white'
              }`} 
              value={inputPassword} 
              onChange={(e) => {setInputPassword(e.target.value); setLoginError(false);}} 
            />
          </div>
          
          {loginError && (
            <p className="text-red-500 text-xs font-bold text-center animate-bounce">
              Login yoki parol xato!
            </p>
          )}
        </div>

        <button 
          onClick={onLogin} 
          className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 hover:shadow-blue-200 shadow-lg active:scale-95 transition-all uppercase tracking-widest"
        >
          TIZIMGA KIRISH
        </button>
        
        <button 
          onClick={() => {
            setCurrentPage('landing');
            setLoginError(false);
            setInputPassword('');
          }} 
          className="mt-6 text-gray-400 font-bold uppercase text-xs hover:text-slate-600 transition-colors"
        >
          Orqaga qaytish
        </button>
      </div>
    </div>
  );
};

export default LoginPage;