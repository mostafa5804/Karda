import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Employee, EmployeeAttendance, ParsedExcelRow } from '../types';
import { getDaysInJalaliMonth, getFormattedDate } from '../utils/calendar';

interface ProjectData {
    employees: Employee[];
    attendance: EmployeeAttendance;
}

interface EmployeeState {
    projectData: {
        [projectId: string]: ProjectData;
    };
    getProjectData: (projectId: string) => ProjectData;
    addEmployee: (projectId: string, employeeData: Omit<Employee, 'id' | 'isArchived'>) => void;
    updateEmployee: (projectId: string, employeeId: string, updates: Partial<Omit<Employee, 'id'>>) => void;
    bulkUpdateEmployees: (projectId: string, employeeIds: string[], updates: Partial<Omit<Employee, 'id'>>) => void;
    toggleEmployeeArchiveStatus: (projectId: string, employeeId: string) => void;
    removeEmployee: (projectId: string, employeeId: string) => void;
    setAttendance: (projectId: string, employeeId: string, date: string, status: string, year: number, month: number) => void;
    importAndUpsertData: (projectId: string, data: ParsedExcelRow[]) => void;
    upsertPersonnel: (projectId: string, personnelData: Partial<Employee>[]) => void;
    removeProjectData: (projectId: string) => void;
    getStateForBackup: () => Omit<EmployeeState, 'getProjectData'>;
    restoreState: (state: Omit<EmployeeState, 'getProjectData'>) => void;
}

const emptyProjectData: ProjectData = { employees: [], attendance: {} };

export const useEmployeeStore = create(
    persist<EmployeeState>(
        (set, get) => ({
            projectData: {
                'default': emptyProjectData
            },
            getProjectData: (projectId) => {
                return get().projectData[projectId] || emptyProjectData;
            },
            addEmployee: (projectId, employeeData) => set(state => {
                const project = state.getProjectData(projectId);
                const newEmployee: Employee = {
                    ...employeeData,
                    id: new Date().toISOString() + Math.random(),
                    isArchived: false,
                };
                const updatedEmployees = [...project.employees, newEmployee];
                return {
                    projectData: {
                        ...state.projectData,
                        [projectId]: { ...project, employees: updatedEmployees }
                    }
                };
            }),
            updateEmployee: (projectId, employeeId, updates) => set(state => {
                const project = state.getProjectData(projectId);
                const updatedEmployees = project.employees.map(emp =>
                    emp.id === employeeId ? { ...emp, ...updates } : emp
                );
                return {
                    projectData: {
                        ...state.projectData,
                        [projectId]: { ...project, employees: updatedEmployees }
                    }
                };
            }),
            bulkUpdateEmployees: (projectId, employeeIds, updates) => set(state => {
                const project = state.getProjectData(projectId);
                const idSet = new Set(employeeIds);
                const updatedEmployees = project.employees.map(emp => 
                    idSet.has(emp.id) ? { ...emp, ...updates } : emp
                );
                 return {
                    projectData: {
                        ...state.projectData,
                        [projectId]: { ...project, employees: updatedEmployees }
                    }
                };
            }),
            toggleEmployeeArchiveStatus: (projectId, employeeId) => set(state => {
                const project = state.getProjectData(projectId);
                const updatedEmployees = project.employees.map(emp =>
                    emp.id === employeeId ? { ...emp, isArchived: !emp.isArchived } : emp
                );
                return {
                    projectData: {
                        ...state.projectData,
                        [projectId]: { ...project, employees: updatedEmployees }
                    }
                };
            }),
            removeEmployee: (projectId, employeeId) => set(state => {
                const project = state.getProjectData(projectId);
                const updatedEmployees = project.employees.filter(emp => emp.id !== employeeId);
                const updatedAttendance = { ...project.attendance };
                delete updatedAttendance[employeeId];
                return {
                     projectData: {
                        ...state.projectData,
                        [projectId]: { employees: updatedEmployees, attendance: updatedAttendance }
                    }
                }
            }),
            setAttendance: (projectId, employeeId, date, status, year, month) => set(state => {
                const project = state.getProjectData(projectId);
                let updatedEmployees = [...project.employees];
                const newAttendance = JSON.parse(JSON.stringify(project.attendance));
                
                if (!newAttendance[employeeId]) {
                    newAttendance[employeeId] = {};
                }
                
                newAttendance[employeeId][date] = status;

                if (status.toLowerCase() === 'ت') {
                    // Settlement logic
                    const daysInMonth = getDaysInJalaliMonth(year, month);
                    const settlementDay = parseInt(date.split('-')[2], 10);
                    
                    // Auto-fill the rest of the month
                    for (let day = settlementDay + 1; day <= daysInMonth; day++) {
                        const futureDate = getFormattedDate(year, month, day);
                        newAttendance[employeeId][futureDate] = 'ت';
                    }
                    
                    // Update employee's settlement date
                    updatedEmployees = updatedEmployees.map(emp => {
                        if (emp.id === employeeId) {
                            return { ...emp, settlementDate: date };
                        }
                        return emp;
                    });
                } else if (status === '' || status === null || status === undefined) {
                    delete newAttendance[employeeId][date];
                }

                if (Object.keys(newAttendance[employeeId]).length === 0) {
                    delete newAttendance[employeeId];
                }

                return {
                    projectData: {
                        ...state.projectData,
                        [projectId]: { ...project, employees: updatedEmployees, attendance: newAttendance }
                    }
                };
            }),
            importAndUpsertData: (projectId, data) => set(state => {
                const project = state.getProjectData(projectId);
                const existingEmployees = [...project.employees];
                const newAttendance = JSON.parse(JSON.stringify(project.attendance));
                let newEmployeesAdded = 0;

                data.forEach(row => {
                    const existingEmp = existingEmployees.find(e => e.lastName === row.lastName && e.firstName === row.firstName);
                    if (existingEmp) {
                        // Update existing employee
                        Object.assign(existingEmp, { position: row.position, monthlySalary: row.monthlySalary });
                        newAttendance[existingEmp.id] = { ...(newAttendance[existingEmp.id] || {}), ...row.attendance };
                    } else {
                        // Add new employee
                        const newEmployee: Employee = {
                            id: new Date().toISOString() + Math.random() + (newEmployeesAdded++),
                            lastName: row.lastName,
                            firstName: row.firstName,
                            position: row.position,
                            monthlySalary: row.monthlySalary,
                            isArchived: false,
                        };
                        existingEmployees.push(newEmployee);
                        newAttendance[newEmployee.id] = row.attendance;
                    }
                });

                return {
                    projectData: {
                        ...state.projectData,
                        [projectId]: { employees: existingEmployees, attendance: newAttendance }
                    }
                };
            }),
            upsertPersonnel: (projectId, personnelData) => set(state => {
                const project = state.getProjectData(projectId);
                const updatedEmployees = [...project.employees];

                personnelData.forEach(p => {
                    if (!p.nationalId) return; // Skip if no national ID
                    const existingIndex = updatedEmployees.findIndex(e => e.nationalId === p.nationalId);
                    if (existingIndex > -1) {
                        // Update existing
                        updatedEmployees[existingIndex] = { ...updatedEmployees[existingIndex], ...p };
                    } else {
                        // Add new
                        const newEmployee: Employee = {
                            id: new Date().toISOString() + Math.random(),
                            isArchived: false,
                            firstName: '',
                            lastName: '',
                            position: '',
                            monthlySalary: 0,
                            ...p,
                        };
                        updatedEmployees.push(newEmployee);
                    }
                });
                
                return {
                    projectData: {
                        ...state.projectData,
                        [projectId]: { ...project, employees: updatedEmployees }
                    }
                };
            }),
            removeProjectData: (projectId) => set(state => {
                const newProjectData = { ...state.projectData };
                delete newProjectData[projectId];
                return { projectData: newProjectData };
            }),
            getStateForBackup: () => ({ projectData: get().projectData }),
            restoreState: (state) => {
                if (state && state.projectData) {
                    set({ projectData: state.projectData });
                }
            },
        }),
        {
            name: 'employee-storage-v2', // version bump
            storage: createJSONStorage(() => localStorage),
        }
    )
);
