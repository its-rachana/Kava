import React from "react";
import {BrowserRouter as Router, Routes, Route} from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ChatPage from "./pages/ChatPage";

import SecretChat from "./pages/secretChat";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";


function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Login/>}/>
                <Route path="/register" element={<Register/>}/>
                <Route path="/chats" element={<ChatPage/>}/>
                <Route path="/secret-chat" element={<SecretChat/>}/>
                <Route path="/profile" element={<Profile/>}/>
                <Route path="/forgot-password" element={<ForgotPassword/>}/>
            </Routes>
        </Router>
    );
}

export default App;
