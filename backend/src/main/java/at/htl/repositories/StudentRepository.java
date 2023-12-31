package at.htl.repositories;

import at.htl.model.Group;
import at.htl.model.Student;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@ApplicationScoped
public class StudentRepository implements PanacheRepository<Student> {

    public Student merge(Student student) {

        List<Group> groups = new ArrayList<>();
//
//        for (Group group : groups) {
//            if (!group.getName().equals(student.getGroup().getName()) && !group.getYear().equals(student.getGroup().getYear())) {
//                groups.add(student.getGroup());
//                return getEntityManager().merge(student);
//            }
//        }

        return getEntityManager().merge(student);
    }

    public List<Student> findStudentsByGroupIds(List<String> groupIds) {
        List<Student> students = new ArrayList<>();

        groupIds.forEach(id -> students.addAll(find("group.id", id).list()));

        return students;
    }

}
