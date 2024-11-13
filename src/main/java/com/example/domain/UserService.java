package com.example.domain;

import java.util.Collections;
import java.util.HashSet;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;  

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder; // инжектируем PasswordEncoder

    public User registrationUser(String username, String password){
        // проверка на наличие пользователя с таким же именем
        if (userRepository.findByUsername(username) != null){

            throw new RuntimeException("User already exists");
        }
        // создание нового пользователя
        User user = new User();
        user.setUsername(username);
        user.setPassword(password);

        // Хеширование пароля
        String encodedPassword = passwordEncoder.encode(password);
        user.setPassword(encodedPassword); // сохраняем хешированный пароль
    
        // назначаем роль "USER" по умолчанию
        Role userRole = roleRepository.findByName("USER");
        if (userRole == null){
            // если роли "USER" не существует, создаем её
            userRole = new Role();
            userRole.setName("USER");
            roleRepository.save(userRole);
        }

        user.setRoles(new HashSet<>(Collections.singletonList(userRole)));
        return userRepository.save(user);
    }

    public void assignAdminRole(User user){
        Role adminRole  = roleRepository.findByName("ADMIN");
        if (adminRole  == null){
            adminRole  = new Role();
            adminRole.setName("ADMIN");
            roleRepository.save(adminRole);
        }

        user.getRoles().add(adminRole);
        userRepository.save(user);
    }

    public User findUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }
}
