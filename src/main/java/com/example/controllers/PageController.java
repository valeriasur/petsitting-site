package com.example.controllers;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.stereotype.Controller;



@Controller
public class PageController {

    @GetMapping("/")
    public String home2() {
        return "home";  
    }

    @GetMapping("/home")
    public String home() {
        return "home";  
    }

    @GetMapping("/login")
    public String login(){
        return "login";
    }

    @GetMapping("/hello")
    public String hello(){
        return "hello";
    }
    

}
