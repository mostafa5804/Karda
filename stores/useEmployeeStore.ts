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
    addEmployee: (projectId: string, employeeData: Omit<Employee, 'id' | 'isArchived'>) => Employee;
    updateEmployee: (projectId: string, employeeId: string, updates: Partial<Omit<Employee, 'id'>>) => void;
    bulkUpdateEmployees: (projectId: string, employeeIds: string[], updates: Partial<Omit<Employee, 'id'>>) => void;
    toggleEmployeeArchiveStatus: (projectId: string, employeeId: string) => void;
    removeEmployee: (projectId: string, employeeId: string) => void;
    setAttendance: (projectId: string, employeeId: string, date: string, status: string, year: number, month: number) => void;
    importAndUpsertData: (projectId: string, data: ParsedExcelRow[]) => void;
    upsertPersonnel: (projectId: string, personnelData: Partial<Employee>[]) => void;
    removeProjectData: (projectId: string) => void;
    getStateForBackup: () => Omit<EmployeeState, 'getProjectData' | 'addEmployee'>;
    restoreState: (state: Omit<EmployeeState, 'getProjectData' | 'addEmployee'>) => void;
}

const emptyProjectData: ProjectData = { employees: [], attendance: {} };

// A fallback for creating folder names when a national ID is not available (e.g., during attendance-only import)
const generateFallbackFolderName = (
    employeeData: { firstName?: string; lastName?: string; },
    uniqueId: string
): string => {
    const sanitize = (name: string) => (name || 'unknown').replace(/[\/\\?%*:|"<>.\s]/g, '_');
    const firstName = sanitize(employeeData.firstName);
    const lastName = sanitize(employeeData.lastName);
    const uniqueIdentifier = uniqueId.slice(-6);
    return `${firstName}_${lastName}_${uniqueIdentifier}`;
};


export const useEmployeeStore = create(
    persist<EmployeeState>(
        (set, get) => ({
            projectData: {
                'default': emptyProjectData
            },
            getProjectData: (projectId) => {
                return get().projectData[projectId] || emptyProjectData;
            },
            addEmployee: (projectId, employeeData) => {
                let newEmployee: Employee | null = null;
                set(state => {
                    const project = state.getProjectData(projectId);
                    
                    const newEmployeeId = new Date().toISOString() + Math.random();
                    // Use the mandatory and unique national ID for the folder name.
                    const documentsFolderName = employeeData.nationalId!;

                    newEmployee = {
                        ...employeeData,
                        id: newEmployeeId,
                        isArchived: false,
                        documentsFolderName,
                    };
                    const updatedEmployees = [...project.employees, newEmployee];
                    return {
                        projectData: {
                            ...state.projectData,
                            [projectId]: { ...project, employees: updatedEmployees }
                        }
                    };
                });
                return newEmployee!;
            },
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
                let updatedEmployees = [...project.employees];
                const newAttendance = JSON.parse(JSON.stringify(project.attendance));
                let newEmployeesAdded = 0;
            
                const employeesInExcel = new Set<string>();
            
                data.forEach(row => {
                    const existingEmp = updatedEmployees.find(e => e.lastName === row.lastName && e.firstName === row.firstName);
                    if (existingEmp) {
                        // Update existing employee and ensure they are active
                        Object.assign(existingEmp, { 
                            position: row.position, 
                            monthlySalary: row.monthlySalary, 
                            isArchived: false 
                        });
                        newAttendance[existingEmp.id] = { ...(newAttendance[existingEmp.id] || {}), ...row.attendance };
                        employeesInExcel.add(existingEmp.id);
                    } else {
                        // Add new employee
                        const newEmployeeId = new Date().toISOString() + Math.random() + (newEmployeesAdded++);
                        const documentsFolderName = generateFallbackFolderName(row, newEmployeeId);
                        const newEmployee: Employee = {
                            id: newEmployeeId,
                            lastName: row.lastName,
                            firstName: row.firstName,
                            position: row.position,
                            monthlySalary: row.monthlySalary,
                            isArchived: false,
                            documentsFolderName,
                        };
                        updatedEmployees.push(newEmployee);
                        newAttendance[newEmployee.id] = row.attendance;
                        employeesInExcel.add(newEmployee.id);
                    }
                });
            
                // Archive any employee who was NOT in the Excel file
                const finalEmployees = updatedEmployees.map(emp => {
                    if (!employeesInExcel.has(emp.id)) {
                        return { ...emp, isArchived: true };
                    }
                    return emp;
                });
            
                return {
                    projectData: {
                        ...state.projectData,
                        [projectId]: { employees: finalEmployees, attendance: newAttendance }
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
                        const newEmployeeId = new Date().toISOString() + Math.random();
                        // Use the mandatory national ID for the folder name.
                        const documentsFolderName = p.nationalId;
                        const newEmployee: Employee = {
                            id: newEmployeeId,
                            isArchived: false,
                            firstName: '',
                            lastName: '',
                            position: '',
                            monthlySalary: 0,
                            ...p,
                            documentsFolderName,
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