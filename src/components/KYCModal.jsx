import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Typography,
  Button, TextField, Snackbar, Box, Chip, IconButton, Stepper, Step,
  StepLabel, Card, CardContent, Divider, LinearProgress, Tab, Tabs,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio
} from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import LinkIcon from "@mui/icons-material/Link";
import BusinessIcon from "@mui/icons-material/Business";
import DescriptionIcon from "@mui/icons-material/Description";
import { auth, db, storage } from "../firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const KYCModal = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMethod, setUploadMethod] = useState("file"); // "file" or "link"

  // Document states for files
  const [gstFile, setGstFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [incFile, setIncFile] = useState(null);
  const [signatoryFile, setSignatoryFile] = useState(null);
  const [bankFile, setBankFile] = useState(null);

  // Document states for links
  const [gstLink, setGstLink] = useState("");
  const [panLink, setPanLink] = useState("");
  const [incLink, setIncLink] = useState("");
  const [signatoryLink, setSignatoryLink] = useState("");
  const [bankLink, setBankLink] = useState("");

  // Operational info states
  const [services, setServices] = useState("");
  const [fleetDetails, setFleetDetails] = useState("");
  const [coverageZones, setCoverageZones] = useState("");
  const [pricingModel, setPricingModel] = useState("");
  const [trackingCapability, setTrackingCapability] = useState("");

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const steps = ["Company Documents", "Operational Details", "Review & Submit"];
  
  const documentFields = [
    { 
      name: "GST Certificate", 
      file: gstFile, 
      fileSetter: setGstFile, 
      link: gstLink, 
      linkSetter: setGstLink, 
      required: true 
    },
    { 
      name: "PAN Card", 
      file: panFile, 
      fileSetter: setPanFile, 
      link: panLink, 
      linkSetter: setPanLink, 
      required: true 
    },
    { 
      name: "Certificate of Incorporation", 
      file: incFile, 
      fileSetter: setIncFile, 
      link: incLink, 
      linkSetter: setIncLink, 
      required: true 
    },
    { 
      name: "Signatory ID Proof", 
      file: signatoryFile, 
      fileSetter: setSignatoryFile, 
      link: signatoryLink, 
      linkSetter: setSignatoryLink, 
      required: true 
    },
    { 
      name: "Bank Details/Cancelled Cheque", 
      file: bankFile, 
      fileSetter: setBankFile, 
      link: bankLink, 
      linkSetter: setBankLink, 
      required: true 
    },
  ];

  const resetForm = () => {
    setActiveStep(0);
    setUploadMethod("file");
    
    // Reset files
    setGstFile(null);
    setPanFile(null);
    setIncFile(null);
    setSignatoryFile(null);
    setBankFile(null);
    
    // Reset links
    setGstLink("");
    setPanLink("");
    setIncLink("");
    setSignatoryLink("");
    setBankLink("");
    
    setServices("");
    setFleetDetails("");
    setCoverageZones("");
    setPricingModel("");
    setTrackingCapability("");
    setUploadProgress(0);
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const uploadFile = async (file, folder, uid) => {
    if (!file) return null;
    const fileRef = ref(storage, `kyc-documents/${uid}/${folder}/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  const validateURL = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleFileChange = (setter) => (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setSnackbar({ open: true, message: "File size must be under 5MB.", severity: "error" });
        return;
      }
      setter(file);
    }
  };

  const handleLinkChange = (setter) => (event) => {
    const url = event.target.value;
    setter(url);
  };

  const clearDocument = (docIndex) => {
    const doc = documentFields[docIndex];
    doc.fileSetter(null);
    doc.linkSetter("");
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (uploadMethod === "file") {
        const requiredFiles = [gstFile, panFile, incFile, signatoryFile, bankFile];
        if (requiredFiles.some(file => !file)) {
          setSnackbar({ 
            open: true, 
            message: "Please upload all required company documents.", 
            severity: "error" 
          });
          return;
        }
      } else {
        const requiredLinks = [gstLink, panLink, incLink, signatoryLink, bankLink];
        if (requiredLinks.some(link => !link.trim())) {
          setSnackbar({ 
            open: true, 
            message: "Please provide all required document links.", 
            severity: "error" 
          });
          return;
        }
        
        // Validate URLs
        const invalidLinks = requiredLinks.filter(link => link.trim() && !validateURL(link));
        if (invalidLinks.length > 0) {
          setSnackbar({ 
            open: true, 
            message: "Please provide valid URLs for all document links.", 
            severity: "error" 
          });
          return;
        }
      }
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
      setSnackbar({ 
        open: true, 
        message: "No user is logged in. Please sign in again.", 
        severity: "error" 
      });
      return;
    }

    setLoading(true);
    try {
      setUploadProgress(10);
      const uid = user.uid;
      let documentUrls = {};

      if (uploadMethod === "file") {
        // Upload files to Firebase Storage
        const gstUrl = await uploadFile(gstFile, "gst", uid); setUploadProgress(25);
        const panUrl = await uploadFile(panFile, "pan", uid); setUploadProgress(40);
        const incUrl = await uploadFile(incFile, "incorporation", uid); setUploadProgress(55);
        const signatoryUrl = await uploadFile(signatoryFile, "signatory", uid); setUploadProgress(70);
        const bankUrl = await uploadFile(bankFile, "bank", uid); setUploadProgress(85);
        
        documentUrls = {
          gstCertificate: gstUrl,
          panCard: panUrl,
          incorporation: incUrl,
          signatoryId: signatoryUrl,
          bankDetails: bankUrl,
        };
      } else {
        // Use provided links
        setUploadProgress(50);
        documentUrls = {
          gstCertificate: gstLink,
          panCard: panLink,
          incorporation: incLink,
          signatoryId: signatoryLink,
          bankDetails: bankLink,
        };
        setUploadProgress(85);
      }

      const docRef = doc(db, "users", uid);
      await updateDoc(docRef, {
        documents: documentUrls,
        documentUploadMethod: uploadMethod, // Track which method was used
        operationalInfo: {
          services,
          fleetDetails,
          coverageZones,
          pricingModel,
          trackingCapability,
        },
        kycStatus: "pending", // Update status to 'pending' for admin review
        kycSubmittedAt: new Date(),
      });

      setUploadProgress(100);
      setSnackbar({ 
        open: true, 
        message: "KYC submitted successfully! Waiting for admin approval.", 
        severity: "success" 
      });
      
      setTimeout(() => {
        onClose(); // Close the modal and trigger refresh in Dashboard
      }, 2000);

    } catch (err) {
      console.error("KYC submission error:", err);
      setSnackbar({ 
        open: true, 
        message: `Submission failed: ${err.message}`, 
        severity: "error" 
      });
      setLoading(false);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0: return renderDocumentUpload();
      case 1: return renderOperationalDetails();
      case 2: return renderReview();
      default: return "Unknown step";
    }
  };

  const renderDocumentUpload = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Upload Required Documents</Typography>
      
      {/* Upload Method Selection */}
      <Card variant="outlined" sx={{ mb: 3, bgcolor: 'grey.50' }}>
        <CardContent>
          <FormControl component="fieldset">
            <FormLabel component="legend">
              <Typography variant="subtitle2" color="primary">
                Choose Upload Method
              </Typography>
            </FormLabel>
            <RadioGroup
              row
              value={uploadMethod}
              onChange={(e) => {
                setUploadMethod(e.target.value);
                // Clear all documents when switching methods
                documentFields.forEach((_, index) => clearDocument(index));
              }}
            >
              <FormControlLabel 
                value="file" 
                control={<Radio />} 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CloudUploadIcon fontSize="small" />
                    Upload Files
                  </Box>
                } 
              />
              <FormControlLabel 
                value="link" 
                control={<Radio />} 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkIcon fontSize="small" />
                    Provide Links
                  </Box>
                } 
              />
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>

      {/* Document Upload/Link Section */}
      <Grid container spacing={2}>
        {documentFields.map((docItem, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Card 
              variant="outlined" 
              sx={{ 
                border: (uploadMethod === "file" ? docItem.file : docItem.link.trim()) 
                  ? "2px solid #4caf50" 
                  : "2px dashed #ccc" 
              }}
            >
              <CardContent>
                {uploadMethod === "file" ? (
                  // File Upload Mode
                  <Box sx={{ textAlign: 'center' }}>
                    <CloudUploadIcon 
                      sx={{ 
                        fontSize: 30, 
                        mb: 1, 
                        color: docItem.file ? 'success.main' : 'text.secondary' 
                      }} 
                    />
                    <Typography variant="subtitle2" gutterBottom>
                      {docItem.name}
                    </Typography>
                    <input 
                      accept=".pdf,.jpg,.png,.jpeg" 
                      style={{ display: "none" }} 
                      id={`file-${index}`} 
                      type="file" 
                      onChange={handleFileChange(docItem.fileSetter)} 
                    />
                    <label htmlFor={`file-${index}`}>
                      <Button variant="outlined" component="span" size="small">
                        {docItem.file ? "Change File" : "Choose File"}
                      </Button>
                    </label>
                    {docItem.file && (
                      <Chip 
                        label={docItem.file.name} 
                        size="small" 
                        sx={{ mt: 1, maxWidth: "100%" }} 
                        color="success" 
                        onDelete={() => docItem.fileSetter(null)}
                      />
                    )}
                  </Box>
                ) : (
                  // Link Input Mode
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <LinkIcon 
                        sx={{ 
                          fontSize: 24, 
                          mr: 1, 
                          color: docItem.link.trim() ? 'success.main' : 'text.secondary' 
                        }} 
                      />
                      <Typography variant="subtitle2">
                        {docItem.name}
                      </Typography>
                    </Box>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="https://example.com/document.pdf"
                      value={docItem.link}
                      onChange={handleLinkChange(docItem.linkSetter)}
                      error={docItem.link.trim() && !validateURL(docItem.link)}
                      helperText={
                        docItem.link.trim() && !validateURL(docItem.link)
                          ? "Please enter a valid URL"
                          : ""
                      }
                    />
                    {docItem.link.trim() && validateURL(docItem.link) && (
                      <Chip 
                        label="Valid Link" 
                        size="small" 
                        sx={{ mt: 1 }} 
                        color="success" 
                      />
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {uploadMethod === "link" && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Note:</strong> Please ensure all document links are publicly accessible 
            and lead directly to the document files (PDF, JPG, PNG formats preferred).
          </Typography>
        </Box>
      )}
    </Box>
  );

  const renderOperationalDetails = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Operational Information</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField 
            fullWidth 
            label="Types of Services" 
            value={services} 
            onChange={(e) => setServices(e.target.value)} 
            placeholder="e.g., FTL, LTL, Express Delivery" 
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField 
            fullWidth 
            label="Fleet Details" 
            value={fleetDetails} 
            onChange={(e) => setFleetDetails(e.target.value)} 
            placeholder="e.g., 10 Trucks, 5 Tempos" 
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField 
            fullWidth 
            label="Coverage Zones" 
            value={coverageZones} 
            onChange={(e) => setCoverageZones(e.target.value)} 
            placeholder="e.g., Mumbai, Pan-India" 
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField 
            fullWidth 
            label="Pricing Model" 
            value={pricingModel} 
            onChange={(e) => setPricingModel(e.target.value)} 
            placeholder="e.g., Per KM, Fixed Price" 
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField 
            fullWidth 
            label="Tracking Capability" 
            value={trackingCapability} 
            onChange={(e) => setTrackingCapability(e.target.value)} 
            placeholder="e.g., GPS Enabled, Real-time tracking" 
          />
        </Grid>
      </Grid>
    </Box>
  );
  
  const renderReview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Review Your Information</Typography>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom color="primary">
            Documents {uploadMethod === "file" ? "Uploaded" : "Provided"}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
            Method: {uploadMethod === "file" ? "File Upload" : "Document Links"}
          </Typography>
          {documentFields.map((docItem, index) => {
            const hasDocument = uploadMethod === "file" ? docItem.file : docItem.link.trim();
            return (
              <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                <Typography variant="body2">{docItem.name}</Typography>
                <Chip 
                  label={hasDocument ? '✓ Provided' : '✗ Missing'} 
                  size="small" 
                  color={hasDocument ? 'success' : 'error'}
                />
              </Box>
            );
          })}
        </CardContent>
      </Card>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom color="primary">
            Operational Information
          </Typography>
          {services && <Typography variant="body2"><strong>Services:</strong> {services}</Typography>}
          {fleetDetails && <Typography variant="body2"><strong>Fleet:</strong> {fleetDetails}</Typography>}
          {coverageZones && <Typography variant="body2"><strong>Coverage:</strong> {coverageZones}</Typography>}
          {pricingModel && <Typography variant="body2"><strong>Pricing:</strong> {pricingModel}</Typography>}
          {trackingCapability && <Typography variant="body2"><strong>Tracking:</strong> {trackingCapability}</Typography>}
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h5" color="primary">Complete KYC Verification</Typography>
          <IconButton onClick={onClose} disabled={loading}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {loading && (
            <Box sx={{ my: 2 }}>
              <Typography variant="body2" gutterBottom>
                Submitting your information... {Math.round(uploadProgress)}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}
          <Stepper activeStep={activeStep} sx={{ my: 3 }}>
            {steps.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {getStepContent(activeStep)}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          <Button disabled={activeStep === 0 || loading} onClick={handleBack}>
            Back
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button variant="contained" onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit for Verification"}
            </Button>
          ) : (
            <Button variant="contained" onClick={handleNext} disabled={loading}>
              Next
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })} 
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default KYCModal;