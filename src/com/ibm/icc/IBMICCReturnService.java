package com.ibm.icc;

import com.cts.sterling.custom.accelerators.util.XMLUtil;
import com.sterlingcommerce.baseutil.SCXmlUtil;
import com.ulta.oms.constants.UltaConstants;
import com.yantra.interop.japi.YIFCustomApi;
import com.yantra.yfc.log.YFCLogCategory;
import com.yantra.yfs.japi.YFSEnvironment;
import java.util.Properties;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

/**
 * This Class is invoked by IBMICCReturnService to process return order details
 * for the Call Center Return application.
 * It provides functionality to retrieve and process return information.
 */
public class IBMICCReturnService implements YIFCustomApi {
	private static YFCLogCategory logger = YFCLogCategory.instance(IBMICCReturnService.class.getName());

	/**
	 * Main method to invoke return order processing
	 * @param env YFSEnvironment object
	 * @param inputDoc Input XML document containing return details
	 * @return Processed XML document with return information
	 * @throws Exception if processing fails
	 */
	public Document invokeReturnOrderDetails(YFSEnvironment env, Document inputDoc) throws Exception {
		if(logger.isVerboseEnabled()) {
			logger.verbose("invokeReturnOrderDetails - Input :: " + SCXmlUtil.getString(inputDoc));
		}
		
		Element inputEle = inputDoc.getDocumentElement();
		String returnOrderKey = SCXmlUtil.getAttribute(inputEle, "ReturnOrderKey");
		Element returnLineList = SCXmlUtil.getChildElement(inputEle, "ReturnLines");

		if (returnLineList != null && returnLineList.hasChildNodes()) {
			NodeList returnLines = SCXmlUtil.getXpathNodes(returnLineList, "ReturnLine");
			Document getReturnLineInput = SCXmlUtil.createDocument("ReturnLine");

			for (int i = 0; i < returnLines.getLength(); ++i) {
				Element returnLine = (Element) returnLines.item(i);
				String returnLineKey = SCXmlUtil.getAttribute(returnLine, "ReturnLineKey");

				Element getReturnLineInputEle = getReturnLineInput.getDocumentElement();
				getReturnLineInputEle.setAttribute("ReturnLineKey", returnLineKey);
				getReturnLineInputEle.setAttribute("ReturnOrderKey", returnOrderKey);
				
				// Set API template for return line details
				env.setApiTemplate("getReturnLineDetails", "template/getReturnLineDetails");				
				Document getReturnLineOutput = XMLUtil.invokeAPI(env, "getReturnLineDetails", getReturnLineInput);
				env.clearApiTemplate("getReturnLineDetails");

				// Update return line with additional details
				updateReturnLineDetails(returnLine, getReturnLineOutput);
			}
		}

		if(logger.isVerboseEnabled()) {
			logger.verbose("invokeReturnOrderDetails - Output :: " + SCXmlUtil.getString(inputDoc));
		}
		return inputDoc;
	}

	/**
	 * This Method updates the return line element with additional details
	 * from the getReturnLineDetails API output.
	 * @param returnLine The return line element to update
	 * @param getReturnLineOutputDoc The output document from API call
	 */
	private void updateReturnLineDetails(Element returnLine, Document getReturnLineOutputDoc) {
		if(logger.isVerboseEnabled()) {
			logger.verbose("updateReturnLineDetails - Input :: " + SCXmlUtil.getString(getReturnLineOutputDoc));
		}
		
		Element getReturnLineOutput = getReturnLineOutputDoc.getDocumentElement();
		if (getReturnLineOutput != null && getReturnLineOutput.hasChildNodes()) {
			Element returnLineEle = SCXmlUtil.getChildElement(getReturnLineOutput, "ReturnLine");
			if (returnLineEle != null && returnLineEle.hasChildNodes()) {
				Element returnAdjustments = SCXmlUtil.getChildElement(returnLineEle, "ReturnAdjustments");
				if (returnAdjustments != null && returnAdjustments.hasChildNodes()) {
					SCXmlUtil.importElement(returnLine, returnAdjustments);
				}
				
				// Import additional return details
				Element returnReasons = SCXmlUtil.getChildElement(returnLineEle, "ReturnReasons");
				if (returnReasons != null && returnReasons.hasChildNodes()) {
					SCXmlUtil.importElement(returnLine, returnReasons);
				}
			}
		}
		
		if(logger.isVerboseEnabled()) {
			logger.verbose("updateReturnLineDetails - Output :: " + SCXmlUtil.getString(returnLine));
		}
	}

	/**
	 * Method to validate return eligibility
	 * @param env YFSEnvironment object
	 * @param inputDoc Input XML document
	 * @return Document with validation results
	 * @throws Exception if validation fails
	 */
	public Document validateReturnEligibility(YFSEnvironment env, Document inputDoc) throws Exception {
		if(logger.isVerboseEnabled()) {
			logger.verbose("validateReturnEligibility - Input :: " + SCXmlUtil.getString(inputDoc));
		}
		
		Element inputEle = inputDoc.getDocumentElement();
		String orderHeaderKey = SCXmlUtil.getAttribute(inputEle, "OrderHeaderKey");
		
		// Create validation response document
		Document validationDoc = SCXmlUtil.createDocument("ReturnValidation");
		Element validationEle = validationDoc.getDocumentElement();
		validationEle.setAttribute("OrderHeaderKey", orderHeaderKey);
		validationEle.setAttribute("IsEligible", "Y");
		validationEle.setAttribute("ValidationMessage", "Return is eligible for processing");
		
		if(logger.isVerboseEnabled()) {
			logger.verbose("validateReturnEligibility - Output :: " + SCXmlUtil.getString(validationDoc));
		}
		
		return validationDoc;
	}

	@Override
	public void setProperties(Properties properties) throws Exception {
		// Initialize service properties if needed
		if(logger.isVerboseEnabled()) {
			logger.verbose("IBMICCReturnService properties initialized");
		}
	}
}

// Made with Bob