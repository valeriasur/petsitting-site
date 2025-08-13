import React, { useState } from 'react';
import LoginForm from './LoginForm';
import './Login.css';

function Login() {
    const [isLogin, setIsLogin] = useState(true); // Состояние для режима входа/регистрации
  
    return (
      <div className='login-container'>
        <h1>{isLogin ? 'Вход в аккаунт' : 'Регистрация'}</h1>
        <LoginForm isLogin={isLogin} setIsLogin={setIsLogin} /> {/* Передаем setIsLogin как пропс */}
      </div>
    );
  }
export default Login;