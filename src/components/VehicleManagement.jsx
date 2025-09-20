import React, {
  useState,
  useEffect,
  useCallback,
  useReducer,
  useMemo,
} from "react";
import {
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Link, 
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Alert,
  Stack,
  InputAdornment,
  Slide,
  DialogContentText,
  TableContainer,
  CircularProgress,
  Box,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";


import { db } from "../firebaseConfig";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

// --- CONSTANTS ---
const DIALOGS = {
  NONE: null,
  ADD: "ADD",
  EDIT: "EDIT",
  VIEW: "VIEW",
  DELETE: "DELETE",
};
const VEHICLE_COLLECTION_PATH = "Vehicles";

const initialFormState = {
  available_wheels: "",
  capacity: "",
  company_name: "",
  company_url: "",
  price_per_kg: "",
  price_per_tonne: "",
  subtype: "",
  vehicle_type: "",
};

// --- API/SERVICE LAYER ---
const vehicleService = {
  
  getVehicles: async (userId) => {
    if (!userId) return [];
    
    const vehiclesRef = collection(db, VEHICLE_COLLECTION_PATH);
    const vehiclesQuery = query(vehiclesRef, where("userId", "==", userId));
    const vehiclesSnap = await getDocs(vehiclesQuery);
    const allVehicles = [];
    
    vehiclesSnap.forEach((doc) => {
      allVehicles.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return allVehicles;
  },


  saveVehicle: async (vehicleData, originalVehicle, userId) => {
    if (!userId) throw new Error("User not authenticated");
    
    const vehicleDocRef = doc(db, VEHICLE_COLLECTION_PATH, vehicleData.id || Date.now().toString());
    const vehicleDataWithUser = { ...vehicleData, userId };
    await setDoc(vehicleDocRef, vehicleDataWithUser, { merge: true });
  },


  deleteVehicle: async (vehicle) => {
    const vehicleRef = doc(db, VEHICLE_COLLECTION_PATH, vehicle.id);
    await deleteDoc(vehicleRef);
  },
};


const initialState = {
  vehicles: [],
  loading: true,
  snackbar: { open: false, message: "", type: "success" },
  activeDialog: DIALOGS.NONE,
  selectedVehicle: null,
};

function vehicleReducer(state, action) {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, loading: false, vehicles: action.payload };
    case "FETCH_ERROR":
      return {
        ...state,
        loading: false,
        snackbar: { open: true, message: action.payload, type: "error" },
      };
    case "OPEN_DIALOG":
      return {
        ...state,
        activeDialog: action.payload.dialog,
        selectedVehicle: action.payload.vehicle || null,
      };
    case "CLOSE_DIALOG":
      return { ...state, activeDialog: DIALOGS.NONE, selectedVehicle: null };
    case "SHOW_SNACKBAR":
      return { ...state, snackbar: { open: true, ...action.payload } };
    case "HIDE_SNACKBAR":
      return { ...state, snackbar: { ...state.snackbar, open: false } };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

// --- SANITIZE HELPER ---
const sanitize = (text) => (text || "").toString().trim().toLowerCase();

const Transition = React.forwardRef((props, ref) => (
  <Slide direction="up" ref={ref} {...props} />
));

// --- MAIN COMPONENT ---
const VehicleManagement = () => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(vehicleReducer, initialState);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAndSetVehicles = useCallback(async () => {
    if (!user) return;
    
    dispatch({ type: "FETCH_START" });
    try {
      const data = await vehicleService.getVehicles(user.uid);
      dispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch (error) {
      dispatch({
        type: "FETCH_ERROR",
        payload: `Failed to fetch vehicles: ${error.message}`,
      });
    }
  }, [user]);

  useEffect(() => {
    fetchAndSetVehicles();
  }, [fetchAndSetVehicles]);

  const filteredVehicles = useMemo(() => {
    if (!searchQuery) return state.vehicles;
    const lowercasedQuery = sanitize(searchQuery);
    return state.vehicles.filter(
      (v) =>
        !v.isPlaceholder &&
        Object.values(v).some((val) => sanitize(val).includes(lowercasedQuery))
    );
  }, [state.vehicles, searchQuery]);

  // --- Handlers ---
  const handleDialogClose = () => dispatch({ type: "CLOSE_DIALOG" });
  const handleSnackbarClose = () => dispatch({ type: "HIDE_SNACKBAR" });

  const handleSave = async (formData, originalVehicle) => {
    if (!user) {
      dispatch({
        type: "SHOW_SNACKBAR",
        payload: { message: "User not authenticated", type: "error" },
      });
      return;
    }
    
    try {
      await vehicleService.saveVehicle(formData, originalVehicle, user.uid);
      handleDialogClose();
      dispatch({
        type: "SHOW_SNACKBAR",
        payload: { message: "Vehicle saved successfully!", type: "success" },
      });
      await fetchAndSetVehicles();
    } catch (error) {
      dispatch({
        type: "SHOW_SNACKBAR",
        payload: {
          message: `Error saving vehicle: ${error.message}`,
          type: "error",
        },
      });
    }
  };

  const handleDelete = async () => {
    if (!state.selectedVehicle) return;
    try {
      await vehicleService.deleteVehicle(state.selectedVehicle);
      handleDialogClose();
      dispatch({
        type: "SHOW_SNACKBAR",
        payload: { message: "Vehicle deleted successfully.", type: "warning" },
      });
      await fetchAndSetVehicles();
    } catch (error) {
      dispatch({
        type: "SHOW_SNACKBAR",
        payload: {
          message: `Error deleting vehicle: ${error.message}`,
          type: "error",
        },
      });
    }
  };

  if (!user) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Typography>Please log in to view vehicles</Typography>
      </Box>
    );
  }

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Vehicle Management
      </Typography>

      <VehicleToolbar
        onAdd={() =>
          dispatch({ type: "OPEN_DIALOG", payload: { dialog: DIALOGS.ADD } })
        }
        onSearchChange={(e) => setSearchQuery(e.target.value)}
        searchQuery={searchQuery}
      />

      <Paper elevation={3} sx={{ mt: 3, overflowX: "auto" }}>
        <VehicleTable
          vehicles={filteredVehicles}
          loading={state.loading}
          onView={(vehicle) =>
            dispatch({
              type: "OPEN_DIALOG",
              payload: { dialog: DIALOGS.VIEW, vehicle },
            })
          }
          onEdit={(vehicle) =>
            dispatch({
              type: "OPEN_DIALOG",
              payload: { dialog: DIALOGS.EDIT, vehicle },
            })
          }
          onDelete={(vehicle) =>
            dispatch({
              type: "OPEN_DIALOG",
              payload: { dialog: DIALOGS.DELETE, vehicle },
            })
          }
        />
      </Paper>

 
      <VehicleFormDialog
        open={
          state.activeDialog === DIALOGS.ADD ||
          state.activeDialog === DIALOGS.EDIT
        }
        onClose={handleDialogClose}
        onSubmit={handleSave}
        vehicle={state.selectedVehicle}
        isEditMode={state.activeDialog === DIALOGS.EDIT}
      />
      <ViewVehicleDialog
        open={state.activeDialog === DIALOGS.VIEW}
        onClose={handleDialogClose}
        vehicle={state.selectedVehicle}
      />
      <ConfirmDeleteDialog
        open={state.activeDialog === DIALOGS.DELETE}
        onClose={handleDialogClose}
        onConfirm={handleDelete}
      />
      <Snackbar
        open={state.snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={state.snackbar.type}
          sx={{ width: "100%" }}
        >
          {state.snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};


function VehicleToolbar({ onAdd, onSearchChange, searchQuery }) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      justifyContent="space-between"
      mt={4}
    >
      <TextField
        label="Search Vehicles"
        size="small"
        value={searchQuery}
        onChange={onSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ width: { xs: "100%", md: 300 } }}
      />
      <Button startIcon={<AddCircleIcon />} variant="contained" onClick={onAdd}>
        Add Vehicle
      </Button>
    </Stack>
  );
}

function VehicleTable({ vehicles, loading, onView, onEdit, onDelete }) {
  const tableHeaders = [
    "Company Name",
    "Subtype",
    "Vehicle Type",
    "Capacity",
    "Wheels",
    "Price/kg",
    "Price/tonne",
    "Actions",
  ];

  return (
    <TableContainer>
      <Table>
        <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
          <TableRow>
            {tableHeaders.map((header) => (
              <TableCell key={header}>
                <b>{header}</b>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={tableHeaders.length} align="center">
                <CircularProgress />
              </TableCell>
            </TableRow>
          ) : vehicles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={tableHeaders.length} align="center">
                No vehicles found.
              </TableCell>
            </TableRow>
          ) : (
            vehicles.map((v) => (
              <TableRow key={v.id} hover>
                <TableCell>
                  {v.company_url ? (
                    <Link
                      href={v.company_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontWeight: "medium" }}
                    >
                      {v.company_name}
                    </Link>
                  ) : (
                    v.company_name 
                  )}
                </TableCell>
                <TableCell>{v.subtype}</TableCell>
                <TableCell>{v.vehicle_type}</TableCell>
                <TableCell>{v.capacity}</TableCell>
                <TableCell>{v.available_wheels}</TableCell>
                <TableCell>{v.price_per_kg}</TableCell>
                <TableCell>{v.price_per_tonne}</TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0}>
                    <IconButton onClick={() => onView(v)} color="info">
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton onClick={() => onEdit(v)} color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => onDelete(v)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function VehicleFormDialog({ open, onClose, onSubmit, vehicle, isEditMode }) {
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setFormData(isEditMode && vehicle ? vehicle : initialFormState);
      setErrors({});
    }
  }, [open, vehicle, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const tempErrors = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (!value) tempErrors[key] = "This field is required.";
    });
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(formData, isEditMode ? vehicle : null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        {isEditMode ? "Edit Vehicle" : "Add New Vehicle"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {Object.keys(initialFormState).map((key) => (
            <TextField
              key={key}
              name={key}
              label={key
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
              value={formData[key]}
              onChange={handleChange}
              error={!!errors[key]}
              helperText={errors[key]}
              fullWidth
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          {isEditMode ? "Save Changes" : "Add Vehicle"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ViewVehicleDialog({ open, onClose, vehicle }) {
  if (!vehicle) return null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>Vehicle Details</DialogTitle>
      <DialogContent>
        <Stack spacing={1}>
          {Object.entries(vehicle).map(
            ([key, value]) =>
              !["id", "isPlaceholder"].includes(key) && (
                <Typography key={key}>
                  <strong>
                    {key
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                    :
                  </strong>{" "}
                  {value}
                </Typography>
              )
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function ConfirmDeleteDialog({ open, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={onClose} TransitionComponent={Transition}>
      <DialogTitle>Confirm Deletion</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete this vehicle? This action cannot be
          undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="error">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default VehicleManagement;
