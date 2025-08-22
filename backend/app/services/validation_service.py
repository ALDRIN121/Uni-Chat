from app.services.langchain_service import process_query
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

async def validate_groq_api_key(api_key: str, model_name: str = "deepseek-r1-distill-llama-70b") -> Dict[str, Any]:
    """
    Validate GROQ API key by testing it with the existing langchain service
    
    Args:
        api_key: The GROQ API key to validate
        model_name: The model to test with
    
    Returns:
        Dict with validation result and details
    """
    try:
        # Create a temporary LLM config for testing
        test_config = {
            "api_key": api_key,
            "model_name": model_name,
            "temperature": 0,
            "max_tokens": 50
        }
        
        # Test with a simple message using the existing function
        test_message = "Hi"
        response = process_query(test_message, test_config)
        
        if response and response.get("response") and response["response"].strip():
            return {
                "valid": True,
                "message": "API key is valid and model is accessible",
                "model_tested": model_name,
                "test_response": response["response"][:100] + "..." if len(response["response"]) > 100 else response["response"]
            }
        else:
            return {
                "valid": False,
                "message": "API key validation failed: No response received",
                "model_tested": model_name
            }
            
    except Exception as e:
        logger.error(f"GROQ API key validation failed: {str(e)}")
        error_msg = str(e).lower()
        
        if "authentication" in error_msg or "unauthorized" in error_msg or "invalid" in error_msg or "api_key" in error_msg:
            return {
                "valid": False,
                "message": "Invalid API key. Please check your GROQ API key and try again.",
                "error_type": "authentication"
            }
        elif "model" in error_msg or "not found" in error_msg:
            return {
                "valid": False,
                "message": f"Model '{model_name}' is not accessible with this API key.",
                "error_type": "model_access"
            }
        elif "quota" in error_msg or "limit" in error_msg or "rate" in error_msg:
            return {
                "valid": False,
                "message": "API key has reached its usage limit or quota.",
                "error_type": "quota"
            }
        else:
            return {
                "valid": False,
                "message": f"API validation failed: {str(e)}",
                "error_type": "unknown"
            }
