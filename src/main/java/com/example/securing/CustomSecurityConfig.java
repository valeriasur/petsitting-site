package com.example.securing;

import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import com.example.domain.User;
import com.example.domain.UserRepository;


@Configuration
@EnableWebSecurity
public class CustomSecurityConfig {

    @Autowired
    private UserRepository userRepository;
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests((requests) -> requests
                        .requestMatchers( "/","/home").permitAll()
                        .requestMatchers("/registration","/login").permitAll()
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .formLogin((form) -> form
                        .loginPage("/login")
                        .defaultSuccessUrl("/hello",true) // страница перенаправления после авторизации
                        .permitAll()
                )
                .logout((logout) -> logout.permitAll());

        return http.build();
    }



       @Bean
       public UserDetailsService userDetailsService() {
        return username -> {
            // Получаем пользователя из базы данных через репозиторий
            User user = userRepository.findByUsername(username);
            if (user == null) {
                throw new UsernameNotFoundException("User not found");
            }
            System.out.println("User found: " + user.getUsername());
            System.out.println("User roles: " + user.getRoles());

            // Преобразуем его в UserDetails для Spring Security
            return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(), // Здесь будет уже хешированный парол
                user.getRoles().stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getName()))
                    .collect(Collectors.toList())
            );
        };
    }

        @Bean
        public PasswordEncoder passwordEncoder() {
            return new BCryptPasswordEncoder();
}
}
