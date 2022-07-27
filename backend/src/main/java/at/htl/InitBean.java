package at.htl;

import at.htl.model.Group;
import at.htl.model.Student;
import at.htl.repositories.GroupRepository;
import at.htl.repositories.TemplateRepository;
import at.htl.repositories.StudentRepository;
import io.quarkus.runtime.StartupEvent;

import javax.enterprise.context.ApplicationScoped;
import javax.enterprise.event.Observes;
import javax.inject.Inject;
import javax.transaction.Transactional;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;

@ApplicationScoped
public class InitBean {

    final String FILE_NAME = "src/main/resources/students.csv";

    @Inject
    GroupRepository groupRepository;

    @Inject
    StudentRepository studentRepository;

    @Inject
    TemplateRepository templateRepository;

    @Transactional
    void onStart(@Observes StartupEvent event) throws IOException {
        BufferedReader reader = new BufferedReader(new FileReader(FILE_NAME));

        reader.lines().skip(1)
                .distinct()
                .map(x -> x.split(";"))
                .peek(x -> {
                    System.out.printf("%s: %s %s\n", x[4], x[0], x[1]);
                    Group g = new Group(x[5], x[4]);
                    Student s = new Student(x[0], x[1], x[2],x[3], g);
                    studentRepository.merge(s);
                    System.out.println("Saved: " + x[0] + " " + x[1]);
                })
                .count();
    }

}
