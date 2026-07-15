var current = 1;
var steps;

// ---------------------------------------------------------------------------
// GTM dataLayer tracking
// ---------------------------------------------------------------------------
window.dataLayer = window.dataLayer || [];

var ZF_FORM_NAME = "Hookah B2B Registration Form";
var ZF_STEP_NAMES = { 1: "General Info", 2: "Addresses", 3: "Licenses" };

// Fired only once a step's fields are filled in and have passed validation.
function zf_pushStepComplete(step) {
  window.dataLayer.push({
    event: "zf_step_complete",
    zf_formname: ZF_FORM_NAME,
    zf_step: step,
    zf_stepname: ZF_STEP_NAMES[step] || "Step " + step,
  });
}

var zf_submitted = false;

// Native submit() intentionally bypasses the onsubmit handler: validation has
// already run by the time we get here, and re-running it would submit twice.
function zf_doSubmit() {
  if (zf_submitted) {
    return;
  }
  zf_submitted = true;
  document.getElementById("form").submit();
}

// Give GTM a window to fire its tags before the browser navigates to Zoho,
// but never let a slow or blocked container stop the form from submitting.
function zf_pushLeadAndSend() {
  window.dataLayer.push({
    event: "generate_lead",
    zf_formname: ZF_FORM_NAME,
    eventCallback: zf_doSubmit,
    eventTimeout: 2000,
  });
  setTimeout(zf_doSubmit, 2000);
}

$(document).ready(function () {
  var fieldsets = $("fieldset");
  steps = fieldsets.length;

  $(".next").show();
  $(".previous").hide();
  $(".submit").hide();
});

// Validate & Submit Function
function zf_ValidateAndSubmit() {
  if (zf_CheckMandatory()) {
    if (zf_ValidCheck()) {
      if (isSalesIQIntegrationEnabled) {
        zf_addDataToSalesIQ();
      }
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

$(document).ready(function () {
  var current_fs, next_fs, previous_fs;
  var opacity;

  setProgressBar(current);
  updateButtons(); // Ensure buttons are set correctly at start

  $(".next").click(async function () {
    current_fs = $(this).closest("fieldset");
    next_fs = current_fs.next("fieldset");
    if (current === 1) {
      const isMandatoryFilled = zf_CheckMandatory();
      const isPhoneValid = await phoneNumberValidation();
      const isEmailValid = validateEmail($("#Email").val());
      const isEmailexist = await validate_Email()
      const isPhoneFormatted = phoneFormat();
      if (
        !isMandatoryFilled ||
        !isEmailexist ||
        !isPhoneValid ||
        !isPhoneFormatted ||
        !isEmailValid
      ) {
        return false;
      }
    }

    if (current === 2) {
      const isMandatoryFilledv1 = zf_CheckMandatory1();
      const isMandatoryFilledv2 = zf_CheckMandatory2();
      if (!isMandatoryFilledv1){
        return false;
      }

      // let region = document.getElementById("Regionv2").value.trim();
      // if (!$("#DecisionBox3").is(":checked") && region == ""){

      //   zf_ShowErrorMsg('Address1_Region');
      //   return false;
      // }

      if (!$("#DecisionBox3").is(":checked") && !isMandatoryFilledv2){
        return false;
      }
    }

    // Everything above passed, so this step is genuinely complete.
    zf_pushStepComplete(current);

    $("#progressbar li").eq($("fieldset").index(next_fs)).addClass("active");
    // $("#progressbar li").eq($("fieldset").index(current_fs)).removeClass("active");

    next_fs.show();
    current_fs.animate(
      { opacity: 0 },
      {
        step: function (now) {
          opacity = 1 - now;
          current_fs.css({ display: "none", position: "relative" });
          next_fs.css({ opacity: opacity });
        },
        duration: 500,
      }
    );

    current++; // Move forward
    setProgressBar(current);
    updateButtons(); // Ensure buttons update
  });

  $(".previous").click(function () {
    current_fs = $(this).closest("fieldset");
    previous_fs = current_fs.prev("fieldset");

    if (previous_fs.length === 0) {
      console.log("No previous fieldset found!");
      return false;
    }

    // Move back one step
    current--;
    $("#progressbar li")
      .eq($("fieldset").index(previous_fs))
      .addClass("active");
    $("#progressbar li")
      .eq($("fieldset").index(current_fs))
      .removeClass("active");

    // Ensure the fieldset displays correctly
    previous_fs.show();
    previous_fs.css({ display: "block", opacity: 1 });
    current_fs.hide();

    console.log("Current Step After:", current);
    setProgressBar(current);
    updateButtons();
  });

  $("#submitBtn").click(function (e) {
    e.preventDefault(); // Stop default submission first

    if (!zf_ValidateAndSubmit()) {
      return;
    }

    zf_pushStepComplete(current);
    zf_pushLeadAndSend();
  });

  function setProgressBar(curStep) {
    var percent = parseFloat(100 / steps) * curStep;
    percent = percent.toFixed();
    $(".progress-bar").css("width", percent + "%");
  }
});

function updateButtons() {
  $(".previous").toggle(current > 1);
  $(".next").toggle(current < steps);
  $(".submit")
    .toggle(current === steps)
    .prop("disabled", current !== steps);
}

function zf_CheckMandatory() {
  for (i = 0; i < zf_MandArray.length; i++) {
    var fieldObj = document.forms.form[zf_MandArray[i]];
    if (fieldObj) {
      if (fieldObj.nodeName != null) {
        if (fieldObj.nodeName == "OBJECT") {
          if (!zf_MandatoryCheckSignature(fieldObj)) {
            zf_ShowErrorMsg(zf_MandArray[i]);
            return false;
          }
        } else if (fieldObj.value.replace(/^\s+|\s+$/g, "").length == 0) {
          if (fieldObj.type == "file") {
            fieldObj.focus();
            zf_ShowErrorMsg(zf_MandArray[i]);
            return false;
          }
          fieldObj.focus();
          zf_ShowErrorMsg(zf_MandArray[i]);
          return false;
        } else if (fieldObj.nodeName == "SELECT") {
          // No I18N
          if (fieldObj.options[fieldObj.selectedIndex].value == "-Select-") {
            fieldObj.focus();
            zf_ShowErrorMsg(zf_MandArray[i]);
            return false;
          }
        } else if (fieldObj.type == "checkbox" || fieldObj.type == "radio") {
          if (fieldObj.checked == false) {
            fieldObj.focus();
            zf_ShowErrorMsg(zf_MandArray[i]);
            return false;
          }
        }
      } else {
        var checkedValsCount = 0;
        var inpChoiceElems = fieldObj;
        for (var ii = 0; ii < inpChoiceElems.length; ii++) {
          if (inpChoiceElems[ii].checked === true) {
            checkedValsCount++;
          }
        }
        if (checkedValsCount == 0) {
          inpChoiceElems[0].focus();
          zf_ShowErrorMsg(zf_MandArray[i]);
          return false;
        }
      }
    }
  }
  return true;
}

function zf_CheckMandatory1() {
  for (i = 0; i < zf_MandArray1.length; i++) {
    var fieldObj = document.forms.form[zf_MandArray1[i]];
    if (fieldObj) {
      if (fieldObj.nodeName != null) {
        if (fieldObj.nodeName == "OBJECT") {
          if (!zf_MandatoryCheckSignature(fieldObj)) {
            zf_ShowErrorMsg(zf_MandArray1[i]);
            return false;
          }
        } else if (fieldObj.value.replace(/^\s+|\s+$/g, "").length == 0) {
          if (fieldObj.type == "file") {
            fieldObj.focus();
            zf_ShowErrorMsg(zf_MandArray1[i]);
            return false;
          }
          fieldObj.focus();
          zf_ShowErrorMsg(zf_MandArray1[i]);
          return false;
        } else if (fieldObj.nodeName == "SELECT") {
          // No I18N
          if (fieldObj.options[fieldObj.selectedIndex].value == "-Select-") {
            fieldObj.focus();
            zf_ShowErrorMsg(zf_MandArray1[i]);
            return false;
          }
        } else if (fieldObj.type == "checkbox" || fieldObj.type == "radio") {
          if (fieldObj.checked == false) {
            fieldObj.focus();
            zf_ShowErrorMsg(zf_MandArray1[i]);
            return false;
          }
        }
      } else {
        var checkedValsCount = 0;
        var inpChoiceElems = fieldObj;
        for (var ii = 0; ii < inpChoiceElems.length; ii++) {
          if (inpChoiceElems[ii].checked === true) {
            checkedValsCount++;
          }
        }
        if (checkedValsCount == 0) {
          inpChoiceElems[0].focus();
          zf_ShowErrorMsg(zf_MandArray1[i]);
          return false;
        }
      }
    }
  }
  return true;
}

function zf_CheckMandatory2() {
  for (i = 0; i < zf_MandArray2.length; i++) {
    var fieldObj = document.forms.form[zf_MandArray2[i]];
    if (fieldObj) {
      if (fieldObj.nodeName != null) {
        if (fieldObj.nodeName == "OBJECT") {
          if (!zf_MandatoryCheckSignature(fieldObj)) {
            zf_ShowErrorMsg(zf_MandArray2[i]);
            return false;
          }
        } else if (fieldObj.value.replace(/^\s+|\s+$/g, "").length == 0) {
          if (fieldObj.type == "file") {
            fieldObj.focus();
            zf_ShowErrorMsg(zf_MandArray2[i]);
            return false;
          }
          fieldObj.focus();
          zf_ShowErrorMsg(zf_MandArray2[i]);
          return false;
        } else if (fieldObj.nodeName == "SELECT") {
          // No I18N
          if (fieldObj.options[fieldObj.selectedIndex].value == "-Select-") {
            fieldObj.focus();
            zf_ShowErrorMsg(zf_MandArray2[i]);
            return false;
          }
        } else if (fieldObj.type == "checkbox" || fieldObj.type == "radio") {
          if (fieldObj.checked == false) {
            fieldObj.focus();
            zf_ShowErrorMsg(zf_MandArray2[i]);
            return false;
          }
        }
      } else {
        var checkedValsCount = 0;
        var inpChoiceElems = fieldObj;
        for (var ii = 0; ii < inpChoiceElems.length; ii++) {
          if (inpChoiceElems[ii].checked === true) {
            checkedValsCount++;
          }
        }
        if (checkedValsCount == 0) {
          inpChoiceElems[0].focus();
          zf_ShowErrorMsg(zf_MandArray2[i]);
          return false;
        }
      }
    }
  }
  return true;
}

function zf_ValidCheck() {
  var isValid = true;
  for (ind = 0; ind < zf_FieldArray.length; ind++) {
    var fieldObj = document.forms.form[zf_FieldArray[ind]];
    if (fieldObj) {
      if (fieldObj.nodeName != null) {
        var checkType = fieldObj.getAttribute("checktype");
        if (checkType == "c2") {
          // No I18N
          if (!zf_ValidateNumber(fieldObj)) {
            isValid = false;
            fieldObj.focus();
            zf_ShowErrorMsg(zf_FieldArray[ind]);
            return false;
          }
        } else if (checkType == "c3") {
          // No I18N
          if (
            !zf_ValidateCurrency(fieldObj) ||
            !zf_ValidateDecimalLength(fieldObj, 10)
          ) {
            isValid = false;
            fieldObj.focus();
            zf_ShowErrorMsg(zf_FieldArray[ind]);
            return false;
          }
        } else if (checkType == "c4") {
          // No I18N
          if (!zf_ValidateDateFormat(fieldObj)) {
            isValid = false;
            fieldObj.focus();
            zf_ShowErrorMsg(zf_FieldArray[ind]);
            return false;
          }
        } else if (checkType == "c5") {
          // No I18N
          if (!zf_ValidateEmailID(fieldObj)) {
            isValid = false;
            fieldObj.focus();
            zf_ShowErrorMsg(zf_FieldArray[ind]);
            return false;
          }
        } else if (checkType == "c6") {
          // No I18N
          if (!zf_ValidateLiveUrl(fieldObj)) {
            isValid = false;
            fieldObj.focus();
            zf_ShowErrorMsg(zf_FieldArray[ind]);
            return false;
          }
        } else if (checkType == "c7") {
          // No I18N
          if (!zf_ValidatePhone(fieldObj)) {
            isValid = false;
            fieldObj.focus();
            zf_ShowErrorMsg(zf_FieldArray[ind]);
            return false;
          }
        } else if (checkType == "c8") {
          // No I18N
          zf_ValidateSignature(fieldObj);
        } else if (checkType == "c9") {
          // No I18N
          if (!zf_ValidateMonthYearFormat(fieldObj)) {
            isValid = false;
            fieldObj.focus();
            zf_ShowErrorMsg(zf_FieldArray[ind]);
            return false;
          }
        }
      }
    }
  }
  return isValid;
}
function zf_ShowErrorMsg(uniqName) {
  var fldLinkName;
  for (errInd = 0; errInd < zf_FieldArray.length; errInd++) {
    fldLinkName = zf_FieldArray[errInd].split("_")[0];
    document.getElementById(fldLinkName + "_error").style.display = "none";
  }
  var linkName = uniqName.split("_")[0];
  document.getElementById(linkName + "_error").style.display = "block";
}
function zf_ValidateNumber(elem) {
  var validChars = "-0123456789";
  var numValue = elem.value.replace(/^\s+|\s+$/g, "");
  if (numValue != null && !numValue == "") {
    var strChar;
    var result = true;
    if (numValue.charAt(0) == "-" && numValue.length == 1) {
      return false;
    }
    for (i = 0; i < numValue.length && result == true; i++) {
      strChar = numValue.charAt(i);
      if (strChar == "-" && i != 0) {
        return false;
      }
      if (validChars.indexOf(strChar) == -1) {
        result = false;
      }
    }
    return result;
  } else {
    return true;
  }
}
function zf_ValidateDateFormat(inpElem) {
  var dateValue = inpElem.value.replace(/^\s+|\s+$/g, "");
  if (dateValue == "") {
    return true;
  } else {
    return zf_DateRegex.test(dateValue);
  }
}
function zf_ValidateCurrency(elem) {
  var validChars = "0123456789.";
  var numValue = elem.value.replace(/^\s+|\s+$/g, "");
  if (numValue.charAt(0) == "-") {
    numValue = numValue.substring(1, numValue.length);
  }
  if (numValue != null && !numValue == "") {
    var strChar;
    var result = true;
    for (i = 0; i < numValue.length && result == true; i++) {
      strChar = numValue.charAt(i);
      if (validChars.indexOf(strChar) == -1) {
        result = false;
      }
    }
    return result;
  } else {
    return true;
  }
}
function zf_ValidateDecimalLength(elem, decimalLen) {
  var numValue = elem.value;
  if (numValue.indexOf(".") >= 0) {
    var decimalLength = numValue.substring(numValue.indexOf(".") + 1).length;
    if (decimalLength > decimalLen) {
      return false;
    } else {
      return true;
    }
  }
  return true;
}
function zf_ValidateEmailID(elem) {
  var check = 0;
  var emailValue = elem.value;
  if (emailValue != null && !emailValue == "") {
    var emailArray = emailValue.split(",");
    for (i = 0; i < emailArray.length; i++) {
      var emailExp =
        /^[\w]([\w\-.+&'/]*)@([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,22}$/;
      if (!emailExp.test(emailArray[i].replace(/^\s+|\s+$/g, ""))) {
        check = 1;
      }
    }
    if (check == 0) {
      return true;
    } else {
      return false;
    }
  } else {
    return true;
  }
}
function zf_ValidateLiveUrl(elem) {
  var urlValue = elem.value;
  if (urlValue !== null && typeof urlValue !== "undefined") {
    urlValue = urlValue.replace(/^\s+|\s+$/g, "");
    if (urlValue !== "") {
      var urlregex = new RegExp(
        "^(((https|http|ftps|ftp)://[a-zA-Z\\d]+((_|-|@)[a-zA-Z\\d]+)*(\\.[a-zA-Z\\d]+((_|-|@)[a-zA-Z\\d]+)*)+(:\\d{1,5})?)|((w|W){3}(\\.[a-zA-Z\\d]+((_|-|@)[a-zA-Z\\d]+)*){2,}(:\\d{1,5})?)|([a-zA-Z\\d]+((_|-)[a-zA-Z\\d]+)*(\\.[a-zA-Z\\d]+((_|-)[a-zA-Z\\d]+)*)+(:\\d{1,5})?))(/[-\\w.?,:'/\\\\+=&;%$#@()!~]*)?$",
        "i"
      ); // This regex is taken from LiveFieldsUtil.isValidWebSiteFieldURL() method. Changes: i) Add ^ at the beginning and $ at the end. ii) Remove ?i before https and adjust () around https. iii) Add "i" in the RegExp constructor. // No I18N
      return urlregex.test(urlValue);
    }
  }
  return true;
}
function zf_ValidatePhone(inpElem) {
  var ZFPhoneRegex = {
    PHONE_INTE_ALL_REG: /^[+]{0,1}[()0-9-. ]+$/,
    PHONE_INTE_NUMERIC_REG: /^[0-9]+$/,
    PHONE_INTE_CONT_CODE_ENABLED_REG: /^[(0-9-.][()0-9-. ]*$/,
    PHONE_USA_REG: /^[0-9]+$/,
    PHONE_CONT_CODE_REG: /^[+][0-9]{1,4}$/,
  };
  var phoneFormat = parseInt(inpElem.getAttribute("phoneFormat"));
  var fieldInpVal = inpElem.value.replace(/^\s+|\s+$/g, "");
  var toReturn = true;
  if (phoneFormat === 1) {
    if (inpElem.getAttribute("valType") == "code") {
      var codeRexp = ZFPhoneRegex.PHONE_CONT_CODE_REG;
      if (fieldInpVal != "" && !codeRexp.test(fieldInpVal)) {
        return false;
      }
    } else {
      var IRexp = ZFPhoneRegex.PHONE_INTE_ALL_REG;
      if (inpElem.getAttribute("phoneFormatType") == "2") {
        IRexp = ZFPhoneRegex.PHONE_INTE_NUMERIC_REG;
      }
      if (fieldInpVal != "" && !IRexp.test(fieldInpVal)) {
        toReturn = false;
        return toReturn;
      }
    }
    return toReturn;
  } else if (phoneFormat === 2) {
    var InpMaxlength = inpElem.getAttribute("maxlength");
    var USARexp = ZFPhoneRegex.PHONE_USA_REG;
    if (
      fieldInpVal != "" &&
      USARexp.test(fieldInpVal) &&
      fieldInpVal.length == InpMaxlength
    ) {
      toReturn = true;
    } else if (fieldInpVal == "") {
      toReturn = true;
    } else {
      toReturn = false;
    }
    return toReturn;
  }
}

function zf_ValidateSignature(objElem) {
  var linkName = objElem.getAttribute("compname");
  var canvasElem = document.getElementById("drawingCanvas-" + linkName);
  var isValidSign = zf_IsSignaturePresent(objElem, linkName, canvasElem);
  var hiddenSignInputElem = document.getElementById(
    "hiddenSignInput-" + linkName
  );
  if (isValidSign) {
    hiddenSignInputElem.value = canvasElem.toDataURL();
  } else {
    hiddenSignInputElem.value = ""; // No I18N
  }
  return isValidSign;
}

function zf_MandatoryCheckSignature(objElem) {
  var linkName = objElem.getAttribute("compname");
  var canvasElem = document.getElementById("drawingCanvas-" + linkName);
  var isValid = zf_IsSignaturePresent(objElem, linkName, canvasElem);
  return isValid;
}

function zf_IsSignaturePresent(objElem, linkName, canvasElem) {
  var context = canvasElem.getContext("2d"); // No I18N
  var canvasWidth = canvasElem.width;
  var canvasHeight = canvasElem.height;
  var canvasData = context.getImageData(0, 0, canvasWidth, canvasHeight);
  var signLen = canvasData.data.length;
  var flag = false;
  for (var index = 0; index < signLen; index++) {
    if (!canvasData.data[index]) {
      flag = false;
    } else if (canvasData.data[index]) {
      flag = true;
      break;
    }
  }
  return flag;
}

function zf_FocusNext(elem, event) {
  if (event.keyCode == 9 || event.keyCode == 16) {
    return;
  }
  if (event.keyCode >= 37 && event.keyCode <= 40) {
    return;
  }
  var compname = elem.getAttribute("compname");
  var inpElemName = elem.getAttribute("name");
  if (inpElemName == compname + "_countrycode") {
    if (elem.value.length == 3) {
      document.getElementsByName(compname + "_first")[0].focus();
    }
  } else if (inpElemName == compname + "_first") {
    if (elem.value.length == 3) {
      document.getElementsByName(compname + "_second")[0].focus();
    }
  }
}
function zf_ValidateMonthYearFormat(inpElem) {
  var monthYearValue = inpElem.value.replace(/^\s+|\s+$/g, "");
  if (monthYearValue == "") {
    return true;
  } else {
    return zf_MonthYearRegex.test(monthYearValue);
  }
}

async function phoneNumberValidation() {
  const phoneNumber = document
    .getElementById("international_PhoneNumber_countrycode")
    .value.trim();
  const mobileNumber = document
    .getElementById("international_PhoneNumber1_countrycode")
    .value.trim();

  const isValidPhoneNumber = validatePhoneNumber(
    phoneNumber,
    "PhoneNumber_error",
    "Please enter a valid phone number in the required field."
  );
  const isValidMobileNumber = validatePhoneNumber(
    mobileNumber,
    "PhoneNumber1_error",
    "Please enter a valid business number in the required field."
  );

  return isValidPhoneNumber && isValidMobileNumber;
}
function validate_Email() {
  return new Promise(async function (myResolve, myReject) {
    let email = $("#Email").val();
    if (email) {
      const apiUrl =
        "https://middlewares.azurewebsites.net/api/EmailCheckerZoho?environment=Production&email=" +
        email;

      // Make the API call using fetch
      await fetch(apiUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          if (data.flag) {
            document.getElementById("Email_error").innerText = "Email Already Exist";
            document.getElementById("Email_error").style.display = "block";
            myResolve(false);
          } else {
            myResolve(true);
          }
        })
        .catch((error) => {
          // Handle any errors that occur during the fetch
          console.error("There was a problem with the fetch operation:", error);
        });
    } else {
      myResolve(false);
    }
  });
}
function validatePhoneNumber(number, errorId, errorMessage) {
  const isValid = number.length > 5; // Allow strings, do not parseInt()
  const errorElement = document.getElementById(errorId);

  if (isValid) {
    errorElement.style.display = "none";
  } else {
    errorElement.textContent = errorMessage;
    errorElement.style.display = "block";
  }

  return isValid;
}

function phoneFormat() {
  try {
    // Get the phone number inputs
    const phoneInput = document.getElementById(
      "international_PhoneNumber_countrycode"
    );
    const mobileInput = document.getElementById(
      "international_PhoneNumber1_countrycode"
    );

    const phoneNumber = phoneInput.value.trim();
    const mobileNumber = mobileInput.value.trim();

    // Get intlTelInput instances
    const itiPhone = window.intlTelInputGlobals.getInstance(phoneInput);
    const itiMobile = window.intlTelInputGlobals.getInstance(mobileInput);

    // Get selected country codes
    const countryCodePhone = itiPhone
      .getSelectedCountryData()
      .iso2.toUpperCase();
    const countryCodeMobile = itiMobile
      .getSelectedCountryData()
      .iso2.toUpperCase();

    // Initialize libphonenumber
    const phoneUtil = window.libphonenumber.PhoneNumberUtil.getInstance();

    let isValidPhone = validateNumber(
      phoneNumber,
      countryCodePhone,
      "PhoneNumber1_error"
    );
    let isValidMobile = validateNumber(
      mobileNumber,
      countryCodeMobile,
      "PhoneNumber_error"
    );

    return isValidPhone && isValidMobile;
  } catch (error) {
    console.error("Phone format validation error:", error);
    return false;
  }
}

// Helper function to validate and display error messages
function validateNumber(number, countryCode, errorElementId) {
  try {
    const phoneUtil = window.libphonenumber.PhoneNumberUtil.getInstance();
    if (!number) {
      showError(errorElementId, "Phone number is required.");
      return false;
    }

    let parsedNumber;
    try {
      parsedNumber = phoneUtil.parse(number, countryCode);
    } catch (e) {
      showError(errorElementId, "Invalid phone number format.");
      return false;
    }

    if (!phoneUtil.isValidNumber(parsedNumber)) {
      showError(errorElementId, "Please enter a valid phone number.");
      return false;
    }

    hideError(errorElementId);
    return true;
  } catch (error) {
    console.error(`Validation error for ${errorElementId}:`, error);
    showError(errorElementId, "Validation failed.");
    return false;
  }
}

// Helper functions to show/hide errors
function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
  }
}

function hideError(elementId) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.style.display = "none";
  }
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(email)) {
    document.getElementById("Email_error").textContent = "";
    document.getElementById("Email_error").style.display = "none";
  } else {
    document.getElementById("Email_error").textContent = "";
    document.getElementById("Email_error").textContent =
      "Please enter a valid email address.";
    document.getElementById("Email_error").style.display = "block";
  }
  return emailRegex.test(email);
}
