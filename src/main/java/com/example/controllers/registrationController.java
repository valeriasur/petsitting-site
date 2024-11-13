package com.example.controllers;

import com.example.domain.User;
import com.example.domain.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;


@Controller
public class registrationController {

    @Autowired
    private UserService userService;

    // Метод для отображения страницы регистрации
    @GetMapping("/registration")
    public String showRegistrationForm(Model model) {
        model.addAttribute("user", new User()); // Создаем новый объект user для формы
        return "registration"; // Возвращаем имя шаблона (например, register.html)
    }

    // Метод для обработки формы регистрации
    @PostMapping("/registration")
    public String registerUser(@RequestParam("username") String username,
                               @RequestParam("password") String password,
                               Model model, RedirectAttributes redirectAttributes) {
        try{
            // Регистрация нового пользователя через сервис
            User user = userService.registrationUser(username, password);
            
            // Добавляем сообщение об успешной регистрации
            redirectAttributes.addFlashAttribute("message", "Регистрация успешна! Пожалуйста, войдите.");
            return "redirect:/login";
        } 
        catch (IllegalArgumentException e){
            // Если ошибка, добавляем ошибку
            model.addAttribute("error", e.getMessage());
            return "registration"; // Возвращаем на страницу логина
    }
}}
