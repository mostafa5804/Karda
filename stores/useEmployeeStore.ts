import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Employee, EmployeeAttendance, ParsedExcelRow, Attendance } from '../types';
import { useFinancialStore } from './useFinancialStore';

interface ProjectData {
    employees: Employee[];
    attendance: EmployeeAttendance;
}

interface EmployeeState {
    projectData: {
        [projectId: string]: ProjectData;
    };
    getProjectData: (projectId: string) => ProjectData;
    addEmployee: (projectId: string, employee: Omit<Employee, 'id' | 'isArchived'>) => void;
    importAndUpsertData: (projectId: string, data: ParsedExcelRow[]) => void;
    updateEmployee: (projectId: string, employeeId: string, updates: Partial<Employee>) => void;
    toggleEmployeeArchiveStatus: (projectId: string, employeeId: string) => void;
    removeEmployeePermanently: (projectId: string, employeeId: string) => void;
    updateAttendance: (projectId: string, employeeId: string, date: string, value: string) => void;
    removeProjectData: (projectId: string) => void;
    getStateForBackup: () => { projectData: { [id: string]: ProjectData } };
    restoreState: (state: { projectData: { [id: string]: ProjectData } }) => void;
}

const initialProjectData: ProjectData = { employees: [], attendance: {} };

const generateUniqueId = () => `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useEmployeeStore = create(
    persist<EmployeeState>(
        (set, get) => ({
            projectData: {
                'default': initialProjectData,
            },
            getProjectData: (projectId) => {
                return get().projectData[projectId] || initialProjectData;
            },
            addEmployee: (projectId, employeeData) => {
                const newEmployee: Employee = { id: generateUniqueId(), isArchived: false, ...employeeData };
                set((state) => {
                    const project = state.getProjectData(projectId);
                    const updatedProject = {
                        ...project,
                        employees: [...project.employees, newEmployee],
                        attendance: { ...project.attendance, [newEmployee.id]: {} },
                    };
                    return { projectData: { ...state.projectData, [projectId]: updatedProject } };
                });
            },
            importAndUpsertData: (projectId, data) => set(state => {
                const project = state.getProjectData(projectId);
                const newAttendance = { ...project.attendance };
                
                // Create a copy for modification, but preserve original order for existing employees
                const updatedEmployees = [...project.employees]; 
                // FIX: Correctly create the Map by having the map function return a [key, value] tuple.
                const existingEmployeesMap = new Map(updatedEmployees.map(e => [`${e.lastName.trim()}-${e.firstName.trim()}`, e]));

                data.forEach(row => {
                    const { lastName, firstName, position, monthlySalary, attendance: rowAttendance } = row;
                    const employeeKey = `${lastName.trim()}-${firstName.trim()}`;
                    const existingEmployee = existingEmployeesMap.get(employeeKey);

                    if (existingEmployee) {
                        // Update existing employee
                        const updatedEmp = { ...existingEmployee, position, monthlySalary };
                        const empIndex = updatedEmployees.findIndex(e => e.id === existingEmployee.id);
                        if (empIndex > -1) {
                            updatedEmployees[empIndex] = updatedEmp;
                        }
                        newAttendance[existingEmployee.id] = { ...(newAttendance[existingEmployee.id] || {}), ...rowAttendance };
                    } else {
                        // Add new employee
                        const newEmployee: Employee = {
                            id: generateUniqueId(),
                            isArchived: false,
                            lastName,
                            firstName,
                            position,
                            monthlySalary
                        };
                        updatedEmployees.push(newEmployee);
                        newAttendance[newEmployee.id] = rowAttendance;
                        // Add to map to handle duplicates in the Excel file itself
                        existingEmployeesMap.set(employeeKey, newEmployee);
                    }
                });

                const updatedProject = {
                    ...project,
                    employees: updatedEmployees,
                    attendance: newAttendance
                };

                return { projectData: { ...state.projectData, [projectId]: updatedProject } };
            }),
            updateEmployee: (projectId, employeeId, updates) => set((state) => {
                const project = state.projectData[projectId];
                if (!project) return state;
                const updatedProject = {
                    ...project,
                    employees: project.employees.map(emp => emp.id === employeeId ? { ...emp, ...updates } : emp),
                };
                return { projectData: { ...state.projectData, [projectId]: updatedProject } };
            }),
            toggleEmployeeArchiveStatus: (projectId, employeeId) => set((state) => {
                 const project = state.projectData[projectId];
                if (!project) return state;
                const updatedProject = {
                    ...project,
                    employees: project.employees.map(emp => emp.id === employeeId ? { ...emp, isArchived: !emp.isArchived } : emp),
                };
                return { projectData: { ...state.projectData, [projectId]: updatedProject } };
            }),
            removeEmployeePermanently: (projectId, employeeId) => {
                useFinancialStore.getState().removeEmployeeFinancials(projectId, employeeId);
                set(state => {
                    const project = state.projectData[projectId];
                    if (!project) return state;

                    const updatedEmployees = project.employees.filter(emp => emp.id !== employeeId);
                    const updatedAttendance = { ...project.attendance };
                    delete updatedAttendance[employeeId];

                    const updatedProject = {
                        ...project,
                        employees: updatedEmployees,
                        attendance: updatedAttendance,
                    };
                    return { projectData: { ...state.projectData, [projectId]: updatedProject } };
                });
            },
            updateAttendance: (projectId, employeeId, date, value) => set((state) => {
                const project = state.projectData[projectId];
                if (!project) return state;
                const updatedProject = {
                    ...project,
                    attendance: {
                        ...project.attendance,
                        [employeeId]: { ...(project.attendance[employeeId] || {}), [date]: value },
                    },
                };
                return { projectData: { ...state.projectData, [projectId]: updatedProject } };
            }),
            removeProjectData: (projectId) => set((state) => {
                const newProjectData = { ...state.projectData };
                delete newProjectData[projectId];
                return { projectData: newProjectData };
            }),
            getStateForBackup: () => ({ projectData: get().projectData }),
            restoreState: (state) => {
                if (state && state.projectData) {
                    set({ projectData: state.projectData });
                } else {
                    console.error("Invalid state provided for employee store restoration.");
                }
            },
        }),
        {
            name: 'employee-storage-v2', // Changed name to avoid conflict with old structure
            storage: createJSONStorage(() => localStorage),
        }
    )
);
