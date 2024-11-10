package com.example;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.stereotype.Controller;

@Controller
public class Controllers {

    @GetMapping("/")
    public String home() {
        return "home";  
    }
    @GetMapping("/home")
    public String home2(){
        return "home";
    }
}
